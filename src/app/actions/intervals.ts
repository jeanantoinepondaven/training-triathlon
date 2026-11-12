"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getOwnedWorkout } from "@/lib/data";
import { addDays, isISODate, today } from "@/lib/dates";
import { canSendToWatch } from "@/lib/intervals-format";
import { checkCredentials, pullActivities, pullWellness, removeFromWatch, sealKey, sendToWatch } from "@/lib/intervals";

export type ConnectState = { error?: string; ok?: string } | undefined;

export async function connectIntervals(_: ConnectState, form: FormData): Promise<ConnectState> {
  const user = await requireUser();
  const key = String(form.get("apiKey") ?? "").trim();
  const athleteId = String(form.get("athleteId") ?? "").trim().replace(/^athlete\//, "") || "0";
  if (key.length < 10) return { error: "Paste your intervals.icu API key (Settings → Developer Settings)." };
  if (!/^(0|i?\d+)$/.test(athleteId)) return { error: "The athlete ID looks like i123456. Leave it empty to use the key's own athlete." };
  try {
    const a = await checkCredentials({ athleteId, key });
    const db = await getDb();
    await db
      .update(schema.users)
      .set({ intervalsAthleteId: a.id, intervalsAthleteName: a.name, intervalsKey: sealKey(key), intervalsConnectedAt: new Date(), intervalsLastSync: null, intervalsLastError: null })
      .where(eq(schema.users.id, user.id));
    let note = "";
    try {
      const r = await pullActivities(user.id);
      note = r.matched + r.added ? ` ${r.matched + r.added} recent session${r.matched + r.added > 1 ? "s" : ""} synced.` : "";
    } catch {}
    try {
      const h = await pullWellness(user.id);
      if (h) note += ` ${h} days of health data.`;
    } catch {}
    revalidatePath("/", "layout");
    return { ok: `Connected to ${a.name}.${note}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function disconnectIntervals() {
  const user = await requireUser();
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ intervalsAthleteId: null, intervalsAthleteName: null, intervalsKey: null, intervalsConnectedAt: null, intervalsLastSync: null, intervalsLastError: null })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
}

/** Pull now (Settings and the week menu). */
export async function syncNow(): Promise<{ matched: number; added: number; health?: number; error?: string }> {
  const user = await requireUser();
  try {
    const r = await pullActivities(user.id, { days: 14 });
    const health = await pullWellness(user.id, { days: 14 });
    revalidatePath("/", "layout");
    return { ...r, health };
  } catch (e) {
    return { matched: 0, added: 0, error: (e as Error).message };
  }
}

/** Called when the app opens: pulls at most every 15 minutes, silently. */
export async function autoSync(): Promise<{ matched: number; added: number; health: number }> {
  const user = await requireUser();
  const db = await getDb();
  const [u] = await db.select({ key: schema.users.intervalsKey, last: schema.users.intervalsLastSync }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!u?.key || (u.last && Date.now() - u.last.getTime() < 15 * 60 * 1000)) return { matched: 0, added: 0, health: 0 };
  try {
    const r = await pullActivities(user.id);
    const health = await pullWellness(user.id).catch(() => 0);
    if (r.matched + r.added + health) revalidatePath("/", "layout");
    return { ...r, health };
  } catch {
    return { matched: 0, added: 0, health: 0 };
  }
}

/** The one manual decision: send this session to the watch, or take it off. */
export async function setOnWatch(id: string, on: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const w = await getOwnedWorkout(user, id);
  if (!w) return { error: "Session not found" };
  try {
    if (on) await sendToWatch(w);
    else await removeFromWatch(w);
    revalidatePath("/", "layout");
    revalidatePath(`/workout/${id}`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Send every remaining swim/bike/run session of a week (from today on). */
export async function sendWeekToWatch(monday: string): Promise<{ sent: number; error?: string }> {
  const user = await requireUser();
  if (!isISODate(monday)) return { sent: 0, error: "Invalid week" };
  const db = await getDb();
  const from = monday > today() ? monday : today();
  const list = await db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.userId, user.id), gte(schema.workouts.date, from), lte(schema.workouts.date, addDays(monday, 6)), ne(schema.workouts.status, "skipped"), ne(schema.workouts.status, "done")));
  let sent = 0;
  try {
    for (const w of list.filter((x) => canSendToWatch(x) && !x.intervalsEventId)) {
      await sendToWatch(w);
      sent++;
    }
  } catch (e) {
    revalidatePath("/", "layout");
    return { sent, error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { sent };
}
