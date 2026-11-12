import "server-only";
import { and, asc, desc, eq, gte, lte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { CurrentUser } from "./auth";

const { users, cycles, workouts } = schema;

export async function listUsers() {
  const db = await getDb();
  return db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.createdAt));
}

/** Both partners can read each other's plans; only the owner can change them. */
export async function getWorkoutsBetween(userId: string, from: string, to: string) {
  const db = await getDb();
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.date, from), lte(workouts.date, to)))
    .orderBy(asc(workouts.date), asc(workouts.position), asc(workouts.createdAt));
}

export async function getWorkout(id: string) {
  const db = await getDb();
  const [w] = await db.select().from(workouts).where(eq(workouts.id, id));
  return w ?? null;
}

export async function getOwnedWorkout(user: CurrentUser, id: string) {
  const w = await getWorkout(id);
  return w && w.userId === user.id ? w : null;
}

export async function listCycles(userId: string) {
  const db = await getDb();
  const cs = await db.select().from(cycles).where(eq(cycles.userId, userId)).orderBy(desc(cycles.startDate));
  if (!cs.length) return [];
  const ws = await db
    .select({ cycleId: workouts.cycleId, status: workouts.status, date: workouts.date })
    .from(workouts)
    .where(inArray(workouts.cycleId, cs.map((c) => c.id)));
  return cs.map((c) => {
    const mine = ws.filter((w) => w.cycleId === c.id);
    return {
      ...c,
      total: mine.length,
      done: mine.filter((w) => w.status === "done").length,
      skipped: mine.filter((w) => w.status === "skipped").length,
    };
  });
}

/** Cycles overlapping a date range, for week headers. */
export async function getCyclesForRange(userId: string, from: string, to: string) {
  const db = await getDb();
  const cs = await db.select().from(cycles).where(and(eq(cycles.userId, userId), lte(cycles.startDate, to)));
  return cs.filter((c) => {
    const end = new Date(Date.parse(c.startDate) + c.weeks * 7 * 86400000).toISOString().slice(0, 10);
    return end > from;
  });
}

export async function getAllWorkouts(userId: string) {
  const db = await getDb();
  return db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(asc(workouts.date));
}

/** Most recent logged sets for each exercise name, before a given workout. */
export async function getLastPerformance(userId: string, names: string[], excludeId: string) {
  const all = await getAllWorkouts(userId);
  const out: Record<string, { date: string; sets: { reps: number | null; weightKg: number | null }[] }> = {};
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  for (const w of all) {
    if (w.id === excludeId || w.status !== "done" || w.log?.kind !== "gym") continue;
    for (const e of w.log.exercises) {
      const k = e.name.toLowerCase();
      if (wanted.has(k) && e.sets.length && (!out[k] || out[k].date <= w.date)) out[k] = { date: w.date, sets: e.sets };
    }
  }
  return out;
}

/** Per-week completion for cycles: { [cycleId]: { [week]: { total, done } } }. */
export async function getCycleWeekStats(cycleIds: string[]) {
  const out: Record<string, Record<number, { total: number; done: number }>> = {};
  if (!cycleIds.length) return out;
  const db = await getDb();
  const rows = await db
    .select({ cycleId: workouts.cycleId, week: workouts.week, status: workouts.status })
    .from(workouts)
    .where(inArray(workouts.cycleId, cycleIds));
  for (const r of rows) {
    if (!r.cycleId || !r.week) continue;
    const wk = ((out[r.cycleId] ??= {})[r.week] ??= { total: 0, done: 0 });
    if (r.status !== "skipped") wk.total++;
    if (r.status === "done") wk.done++;
  }
  return out;
}

export async function listRaces() {
  const db = await getDb();
  return db.select().from(schema.races).orderBy(asc(schema.races.date));
}

export async function getRace(id: string) {
  const db = await getDb();
  const [r] = await db.select().from(schema.races).where(eq(schema.races.id, id));
  return r ?? null;
}

export async function listTargets(userId: string) {
  const db = await getDb();
  return db.select().from(schema.targets).where(eq(schema.targets.userId, userId)).orderBy(asc(schema.targets.createdAt));
}

export async function listAllCycles(userId: string) {
  const db = await getDb();
  return db.select().from(cycles).where(eq(cycles.userId, userId)).orderBy(asc(cycles.startDate));
}

/** Daily health rows from `from` on, oldest first, without the owner id. */
export async function getHealth(userId: string, from: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.wellness)
    .where(and(eq(schema.wellness.userId, userId), gte(schema.wellness.date, from)))
    .orderBy(asc(schema.wellness.date));
  return rows.map((r) => {
    const out: Partial<typeof r> = { ...r };
    delete out.userId;
    delete out.updatedAt;
    return out as Omit<typeof r, "userId" | "updatedAt">;
  });
}

export async function getShareHealth(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ s: users.shareHealth }).from(users).where(eq(users.id, userId));
  return !!u?.s;
}
