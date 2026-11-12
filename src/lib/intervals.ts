import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Workout } from "@/db/schema";
import type { WorkoutPlan } from "./plan-types";
import { activitySport, canSendToWatch, eventType, workoutText } from "./intervals-format";
import { addDays, today } from "./dates";

const { users, workouts } = schema;
const BASE = process.env.INTERVALS_BASE_URL ?? "https://intervals.icu";

// ---------------------------------------------------------------- key encryption (AES-256-GCM)
function encKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me-dev-only-secret");
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHash("sha256").update(`${secret}:intervals-key`).digest();
}
export function sealKey(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
function openKey(sealed: string): string {
  const b = Buffer.from(sealed, "base64");
  const d = createDecipheriv("aes-256-gcm", encKey(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

// ---------------------------------------------------------------- HTTP client
export class IntervalsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Creds = { athleteId: string; key: string };

async function call<T>(creds: Creds, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/v1/athlete/${encodeURIComponent(creds.athleteId || "0")}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`API_KEY:${creds.key}`).toString("base64")}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      // intervals.icu is behind Cloudflare, which can challenge non-browser user agents.
      "User-Agent": "Mozilla/5.0 (compatible; Tandem/1.0; +https://training-triathlon.vercel.app)",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new IntervalsError("intervals.icu refused the API key. Check it in intervals.icu → Settings → Developer.", res.status);
  if (res.status === 429) throw new IntervalsError("intervals.icu rate limit reached. Try again in a few minutes.", 429);
  if (res.status === 404 && method === "DELETE") return undefined as T;
  if (!res.ok) throw new IntervalsError(`intervals.icu error ${res.status}: ${(await res.text()).slice(0, 160)}`, res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function checkCredentials(creds: Creds): Promise<{ id: string; name: string }> {
  const a = await call<{ id: string; name?: string; firstname?: string; lastname?: string }>(creds, "GET", "");
  return { id: String(a.id), name: a.name || [a.firstname, a.lastname].filter(Boolean).join(" ") || String(a.id) };
}

async function credsFor(userId: string): Promise<Creds | null> {
  const db = await getDb();
  const [u] = await db.select({ id: users.intervalsAthleteId, key: users.intervalsKey }).from(users).where(eq(users.id, userId));
  if (!u?.key) return null;
  return { athleteId: u.id || "0", key: openKey(u.key) };
}

export async function intervalsStatus(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({ name: users.intervalsAthleteName, id: users.intervalsAthleteId, connected: users.intervalsConnectedAt, last: users.intervalsLastSync, err: users.intervalsLastError, key: users.intervalsKey })
    .from(users)
    .where(eq(users.id, userId));
  return { connected: !!u?.key, athleteName: u?.name ?? null, athleteId: u?.id ?? null, connectedAt: u?.connected ?? null, lastSync: u?.last ?? null, lastError: u?.err ?? null };
}

// ---------------------------------------------------------------- watch → Tandem (pull activities)
type Activity = {
  id: string;
  start_date_local?: string;
  type?: string;
  name?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  average_heartrate?: number;
  icu_average_watts?: number;
  average_watts?: number;
  total_elevation_gain?: number;
  paired_event_id?: number;
  device_name?: string;
};

const FIELDS = "id,start_date_local,type,name,distance,moving_time,elapsed_time,average_heartrate,icu_average_watts,average_watts,total_elevation_gain,paired_event_id,device_name";

/** Pull recent activities and fill matching sessions. Returns how many sessions were updated or added. */
export async function pullActivities(userId: string, opts: { days?: number } = {}): Promise<{ matched: number; added: number }> {
  const creds = await credsFor(userId);
  if (!creds) return { matched: 0, added: 0 };
  const db = await getDb();
  const [u] = await db.select({ last: users.intervalsLastSync, connected: users.intervalsConnectedAt }).from(users).where(eq(users.id, userId));
  const t = today();
  // First sync looks back 14 days; later ones re-check the last 3 days (late uploads, edits).
  const lastDay = u?.last ? u.last.toISOString().slice(0, 10) : null;
  const oldest = opts.days ? addDays(t, -opts.days) : lastDay ? addDays(lastDay < t ? lastDay : t, -3) : addDays(t, -14);
  try {
    const acts = await call<Activity[]>(creds, "GET", `/activities?oldest=${oldest}&newest=${t}T23:59:59&fields=${FIELDS}`);
    let matched = 0;
    let added = 0;
    const list = (acts ?? []).filter((a) => a.id && a.start_date_local && a.type); // Strava stubs have no data
    if (list.length) {
      const known = await db.select({ id: workouts.intervalsActivityId }).from(workouts).where(and(eq(workouts.userId, userId), inArray(workouts.intervalsActivityId, list.map((a) => String(a.id)))));
      const done = new Set(known.map((k) => k.id));
      const pool = await db.select().from(workouts).where(and(eq(workouts.userId, userId), gte(workouts.date, addDays(oldest, -1)), lte(workouts.date, t)));
      for (const a of list.sort((x, y) => (x.start_date_local! < y.start_date_local! ? -1 : 1))) {
        if (done.has(String(a.id))) continue;
        const kind = activitySport(a.type);
        if (!kind) continue;
        const day = a.start_date_local!.slice(0, 10);
        const free = pool.filter((w) => !w.intervalsActivityId && w.status !== "skipped");
        const w =
          (a.paired_event_id ? free.find((x) => x.intervalsEventId === String(a.paired_event_id)) : undefined) ??
          pickBest(
            free.filter((x) => x.date === day && x.sport === kind.sport && (kind.football ? /football/i.test(x.title) : kind.sport !== "run" || !/football/i.test(x.title))),
            a.moving_time,
          );
        if (!w && kind.snow) continue; // snowboard days only count if planned
        const log = toLog(a, kind.sport, w);
        if (w) {
          await db
            .update(workouts)
            .set({ status: "done", completedAt: w.completedAt ?? new Date(a.start_date_local!), log, intervalsActivityId: String(a.id), activityDevice: a.device_name ?? null })
            .where(eq(workouts.id, w.id));
          w.intervalsActivityId = String(a.id);
          matched++;
        } else if (kind.sport !== "other") {
          const plan: WorkoutPlan = kind.sport === "gym" ? { kind: "gym", exercises: [] } : { kind: "endurance" };
          const [row] = await db
            .insert(workouts)
            .values({ userId, plannedDate: day, date: day, position: 98, sport: kind.sport, title: (a.name || "Extra session").slice(0, 80), plan, status: "done", completedAt: new Date(a.start_date_local!), log, intervalsActivityId: String(a.id), activityDevice: a.device_name ?? null })
            .returning();
          pool.push({ ...row, intervalsActivityId: String(a.id) });
          added++;
        }
      }
    }
    await db.update(users).set({ intervalsLastSync: new Date(), intervalsLastError: null }).where(eq(users.id, userId));
    return { matched, added };
  } catch (e) {
    await db.update(users).set({ intervalsLastError: (e as Error).message.slice(0, 300) }).where(eq(users.id, userId));
    throw e;
  }
}

function pickBest(cands: Workout[], movingS?: number): Workout | undefined {
  if (cands.length <= 1) return cands[0];
  const open = cands.filter((c) => c.status !== "done");
  const set = open.length ? open : cands;
  const planned = (c: Workout) => (c.plan.kind === "endurance" ? (c.plan.durationS ?? 0) : 3600);
  return [...set].sort((x, y) => Math.abs(planned(x) - (movingS ?? 0)) - Math.abs(planned(y) - (movingS ?? 0)))[0];
}

function toLog(a: Activity, sport: Workout["sport"], w?: Workout): Workout["log"] {
  if (sport === "gym") return w?.log ?? { kind: "gym", exercises: [] };
  const watts = a.icu_average_watts ?? a.average_watts;
  return {
    kind: "endurance",
    distanceM: a.distance ? Math.round(a.distance) : undefined,
    durationS: a.moving_time ?? a.elapsed_time,
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    avgPower: sport === "bike" && watts ? Math.round(watts) : undefined,
    elevationM: sport === "run" && a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
  };
}

// ---------------------------------------------------------------- Tandem → watch (planned workouts)
function toEvent(w: Workout) {
  return {
    category: "WORKOUT",
    start_date_local: `${w.date}T00:00:00`,
    type: eventType(w),
    name: w.title,
    description: workoutText(w),
    external_id: `tandem-${w.id}`,
    ...(w.plan.kind === "endurance" && w.plan.durationS ? { moving_time: w.plan.durationS } : {}),
  };
}

/** Put the session on the intervals.icu calendar; intervals.icu pushes it to Garmin Connect → watch. */
export async function sendToWatch(w: Workout): Promise<string> {
  if (!canSendToWatch(w)) throw new Error("Only swim, bike and run sessions with a plan can go to the watch.");
  const creds = await credsFor(w.userId);
  if (!creds) throw new Error("Connect intervals.icu first (Cycles → Settings → Garmin).");
  const db = await getDb();
  let id = w.intervalsEventId;
  if (id) {
    try {
      await call(creds, "PUT", `/events/${id}`, toEvent(w));
    } catch (e) {
      if ((e as IntervalsError).status !== 404) throw e;
      id = null; // deleted on intervals.icu meanwhile: create it again
    }
  }
  if (!id) {
    const ev = await call<{ id: number }>(creds, "POST", "/events", toEvent(w));
    id = String(ev.id);
  }
  await db.update(workouts).set({ intervalsEventId: id }).where(eq(workouts.id, w.id));
  return id;
}

export async function removeFromWatch(w: Pick<Workout, "id" | "userId" | "intervalsEventId">): Promise<void> {
  if (!w.intervalsEventId) return;
  const creds = await credsFor(w.userId);
  if (creds) await call(creds, "DELETE", `/events/${w.intervalsEventId}`);
  const db = await getDb();
  await db.update(workouts).set({ intervalsEventId: null }).where(eq(workouts.id, w.id));
}

/**
 * Keep the watch in step after a change in Tandem: a moved session moves, a skipped or deleted one
 * leaves the watch. Never throws: the change in Tandem always wins, errors are recorded for Settings.
 */
export async function followChange(w: Workout, change: "moved" | "skipped" | "deleted"): Promise<void> {
  if (!w.intervalsEventId) return;
  try {
    if (change === "moved") await sendToWatch(w);
    else await removeFromWatch(w);
  } catch (e) {
    const db = await getDb();
    await db.update(users).set({ intervalsLastError: `Watch update failed: ${(e as Error).message}`.slice(0, 300) }).where(eq(users.id, w.userId));
  }
}

export async function connectedUserIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ id: users.id }).from(users).where(isNotNull(users.intervalsKey));
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------- health (wellness) ⇄ intervals.icu
type ApiWellness = Partial<Record<string, number | string | boolean | null>> & { id: string };

const W_NUM = ["restingHR", "hrv", "hrvSDNN", "sleepSecs", "sleepScore", "avgSleepingHR", "spO2", "respiration", "weight", "bodyFat", "vo2max", "steps", "readiness", "ctl", "atl", "rampRate"] as const;
const W_INT = ["soreness", "fatigue", "stress", "mood", "motivation", "injury"] as const;

/** Pull daily health records (first time: the last 180 days, then the last 7). Returns the number of days stored. */
export async function pullWellness(userId: string, opts: { days?: number } = {}): Promise<number> {
  const creds = await credsFor(userId);
  if (!creds) return 0;
  const db = await getDb();
  const t = today();
  const [have] = await db.select({ date: schema.wellness.date }).from(schema.wellness).where(eq(schema.wellness.userId, userId)).limit(1);
  const oldest = addDays(t, -(opts.days ?? (have ? 7 : 180)));
  const rows = (await call<ApiWellness[]>(creds, "GET", `/wellness?oldest=${oldest}&newest=${t}`)) ?? [];
  const vals = rows
    .filter((r) => typeof r.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.id))
    .map((r) => {
      const v: typeof schema.wellness.$inferInsert = { userId, date: r.id, updatedAt: new Date() };
      for (const k of W_NUM) v[k] = typeof r[k] === "number" ? (r[k] as number) : null;
      for (const k of W_INT) v[k] = typeof r[k] === "number" && (r[k] as number) > 0 ? Math.round(r[k] as number) : null;
      v.comments = typeof r.comments === "string" ? r.comments.slice(0, 500) : null;
      return v;
    })
    .filter((v) => [...W_NUM, ...W_INT].some((k) => v[k] != null));
  for (let i = 0; i < vals.length; i += 100) {
    const chunk = vals.slice(i, i + 100);
    await db
      .insert(schema.wellness)
      .values(chunk)
      .onConflictDoUpdate({
        target: [schema.wellness.userId, schema.wellness.date],
        // Garmin numbers follow intervals.icu; the check-in keeps a local answer if intervals.icu has none.
        set: Object.fromEntries([
          ...[...W_NUM, "comments", "updatedAt"].map((k) => [k, sql.raw(`excluded."${toSnake(k)}"`)]),
          ...W_INT.map((k) => [k, sql.raw(`coalesce(excluded."${toSnake(k)}", "wellness"."${toSnake(k)}")`)]),
        ]),
      });
  }
  return vals.length;
}

function toSnake(k: string) {
  return { restingHR: "resting_hr", hrvSDNN: "hrv_sdnn", spO2: "spo2", avgSleepingHR: "avg_sleeping_hr", updatedAt: "updated_at" }[k] ?? k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Write the morning check-in back to intervals.icu (so it shows there and in its fitness model). */
export async function pushCheckIn(userId: string, date: string, v: Partial<Record<(typeof W_INT)[number], number | null>>): Promise<void> {
  const creds = await credsFor(userId);
  if (!creds) return;
  await call(creds, "PUT", `/wellness/${date}`, { id: date, ...v });
}
