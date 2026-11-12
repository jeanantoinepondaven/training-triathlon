"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getRace, listRaces, listUsers } from "@/lib/data";
import { isISODate } from "@/lib/dates";
import { KIND_PRESETS, SEASON_RACES, racesFor, type RaceKind } from "@/lib/races";
import { SPORTS, TARGET_KINDS, type Race, type Sport, type TargetKind } from "@/db/schema";
import { HOME_COOKIE, HOME_MODULES } from "@/lib/home-modules";

const KINDS: RaceKind[] = ["tri", "run", "bike", "swim"];
const PRI = ["A", "B", "C"] as const;
const clean = (s: unknown, max = 200) => (typeof s === "string" ? s.trim().slice(0, max) : "") || null;

export type RaceInput = {
  name: string;
  date: string;
  kind: RaceKind;
  dist: string;
  priority: "A" | "B" | "C";
  who: string;
  goalTime?: string | null;
  legGoals?: Partial<Record<"swim" | "bike" | "run", string>>;
  place?: string | null;
  note?: string | null;
  result?: string | null;
  resultPlace?: string | null;
  onCal?: boolean;
};

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/races/${id}`);
}

async function validWho(who: string) {
  if (who === "both") return who;
  const people = await listUsers();
  if (!people.some((p) => p.id === who)) throw new Error("Unknown person");
  return who;
}

function sanitize(v: Partial<RaceInput>) {
  const out: Partial<typeof schema.races.$inferInsert> = {};
  if (v.name !== undefined) {
    const n = clean(v.name, 80);
    if (!n) throw new Error("Give the race a name");
    out.name = n;
  }
  if (v.date !== undefined) {
    if (!isISODate(v.date)) throw new Error("Invalid date");
    out.date = v.date;
  }
  if (v.kind !== undefined) {
    if (!KINDS.includes(v.kind)) throw new Error("Invalid race type");
    out.kind = v.kind;
  }
  if (v.dist !== undefined) out.dist = clean(v.dist, 40) ?? KIND_PRESETS[v.kind ?? "tri"][0];
  if (v.priority !== undefined) {
    if (!PRI.includes(v.priority)) throw new Error("Invalid priority");
    out.priority = v.priority;
  }
  if (v.goalTime !== undefined) out.goalTime = clean(v.goalTime, 20);
  if (v.legGoals !== undefined) {
    const lg: Partial<Record<"swim" | "bike" | "run", string>> = {};
    for (const k of ["swim", "bike", "run"] as const) {
      const x = clean(v.legGoals?.[k], 30);
      if (x) lg[k] = x;
    }
    out.legGoals = lg;
  }
  if (v.place !== undefined) out.place = clean(v.place, 80);
  if (v.note !== undefined) out.note = clean(v.note, 1000);
  if (v.result !== undefined) out.result = clean(v.result, 20);
  if (v.resultPlace !== undefined) out.resultPlace = clean(v.resultPlace, 30);
  if (v.onCal !== undefined) out.onCal = v.onCal ? 1 : 0;
  return out;
}

export async function addRace(v: RaceInput): Promise<{ id?: string; error?: string }> {
  const me = await requireUser();
  try {
    const data = sanitize(v);
    const who = await validWho(v.who === "me" ? me.id : v.who);
    const db = await getDb();
    const [r] = await db
      .insert(schema.races)
      .values({ ...(data as typeof schema.races.$inferInsert), createdBy: me.id, who })
      .returning({ id: schema.races.id });
    refresh();
    return { id: r.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add the race" };
  }
}

async function visibleRace(id: string): Promise<Race> {
  const me = await requireUser();
  const r = await getRace(id);
  if (!r || !racesFor([r], me.id).length) throw new Error("Race not found");
  return r;
}

export async function updateRace(id: string, patch: Partial<RaceInput>): Promise<{ error?: string }> {
  try {
    await visibleRace(id);
    const data = sanitize(patch);
    if (patch.who !== undefined) data.who = await validWho(patch.who);
    const db = await getDb();
    await db.update(schema.races).set(data).where(eq(schema.races.id, id));
    refresh(id);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
}

export async function deleteRace(id: string) {
  await visibleRace(id);
  const db = await getDb();
  await db.delete(schema.races).where(eq(schema.races.id, id));
  refresh(id);
}

/** Restore a deleted race (Undo). */
export async function restoreRace(r: Race) {
  const me = await requireUser();
  const db = await getDb();
  const data = sanitize({ ...r, onCal: !!r.onCal });
  await db
    .insert(schema.races)
    .values({ ...(data as typeof schema.races.$inferInsert), id: r.id, createdBy: me.id, who: await validWho(r.who) })
    .onConflictDoNothing();
  refresh();
}

/** Adds the season plan's placeholder races (skips any already there). */
export async function addSeasonRaces(): Promise<{ added: number }> {
  const me = await requireUser();
  const have = await listRaces();
  const db = await getDb();
  const fresh = SEASON_RACES.filter((s) => !have.some((r) => r.date === s.date && r.name === s.name));
  if (fresh.length) await db.insert(schema.races).values(fresh.map((s) => ({ ...s, createdBy: me.id, who: me.id })));
  refresh();
  return { added: fresh.length };
}

/* ---------------- Targets ---------------- */

export type TargetInput = {
  kind: TargetKind;
  sport: Sport;
  title: string;
  metricKey?: string | null;
  startValue: number;
  goalValue: number;
  currentValue?: number | null;
  unit?: string | null;
  lowerIsBetter?: boolean;
  raceId?: string | null;
  due?: string | null;
  note?: string | null;
};

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);

export async function addTarget(v: TargetInput): Promise<{ id?: string; error?: string }> {
  const me = await requireUser();
  const title = clean(v.title, 80);
  if (!title) return { error: "Name the target" };
  if (!TARGET_KINDS.includes(v.kind)) return { error: "Invalid type" };
  if (!SPORTS.includes(v.sport)) return { error: "Invalid sport" };
  const start = num(v.startValue);
  const goal = num(v.goalValue);
  if (start === null || goal === null) return { error: "Enter numbers for now and goal" };
  if (v.raceId) await visibleRace(v.raceId).catch(() => (v.raceId = null));
  const db = await getDb();
  const [t] = await db
    .insert(schema.targets)
    .values({
      userId: me.id,
      kind: v.kind,
      sport: v.sport,
      title,
      metricKey: clean(v.metricKey, 60),
      startValue: start,
      currentValue: num(v.currentValue) ?? start,
      goalValue: goal,
      unit: clean(v.unit, 12),
      lowerIsBetter: v.lowerIsBetter ? 1 : 0,
      raceId: v.raceId || null,
      due: v.due && isISODate(v.due) ? v.due : null,
      note: clean(v.note, 200),
    })
    .returning({ id: schema.targets.id });
  refresh();
  return { id: t.id };
}

async function ownedTarget(id: string) {
  const me = await requireUser();
  const db = await getDb();
  const [t] = await db.select().from(schema.targets).where(eq(schema.targets.id, id));
  if (!t || t.userId !== me.id) throw new Error("Target not found");
  return t;
}

export async function updateTarget(id: string, patch: { currentValue?: number; goalValue?: number; title?: string; raceId?: string | null }) {
  await ownedTarget(id);
  const set: Partial<typeof schema.targets.$inferInsert> = {};
  if (num(patch.currentValue) !== null) set.currentValue = patch.currentValue;
  if (num(patch.goalValue) !== null) set.goalValue = patch.goalValue;
  if (patch.title !== undefined) set.title = clean(patch.title, 80) ?? undefined;
  if (patch.raceId !== undefined) set.raceId = patch.raceId || null;
  const db = await getDb();
  await db.update(schema.targets).set(set).where(eq(schema.targets.id, id));
  refresh();
}

export async function deleteTarget(id: string) {
  await ownedTarget(id);
  const db = await getDb();
  await db.delete(schema.targets).where(eq(schema.targets.id, id));
  refresh();
}

/* ---------------- Home cards ---------------- */

export async function setHomeModules(shown: string[]) {
  await requireUser();
  const hidden = HOME_MODULES.map((m) => m.id).filter((id) => !shown.includes(id));
  (await cookies()).set(HOME_COOKIE, hidden.join(","), { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/");
}
