"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getOwnedWorkout } from "@/lib/data";
import { isISODate } from "@/lib/dates";
import { parseDistance, parseDuration } from "@/lib/units";
import { SPORTS, STATUSES, type Sport, type Status } from "@/db/schema";
import type { GymLog, WorkoutLog, WorkoutPlan } from "@/lib/plan-types";

async function owned(id: string) {
  const user = await requireUser();
  const w = await getOwnedWorkout(user, id);
  if (!w) throw new Error("Session not found");
  return { user, w };
}

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/workout/${id}`);
}

export async function moveWorkout(id: string, date: string) {
  if (!isISODate(date)) throw new Error("Invalid date");
  await owned(id);
  const db = await getDb();
  await db.update(schema.workouts).set({ date }).where(eq(schema.workouts.id, id));
  refresh(id);
}

export async function setStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  await owned(id);
  const db = await getDb();
  await db
    .update(schema.workouts)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(eq(schema.workouts.id, id));
  refresh(id);
}

function intOrNull(v: FormDataEntryValue | null, min: number, max: number): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function numOrUndef(v: FormDataEntryValue | null): number | undefined {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** Save what was actually done and mark the session as done. */
export async function logWorkout(id: string, form: FormData) {
  const { w } = await owned(id);
  let log: WorkoutLog;

  if (w.plan.kind === "gym") {
    const raw = JSON.parse(String(form.get("gym") ?? "[]")) as GymLog["exercises"];
    log = {
      kind: "gym",
      exercises: raw
        .filter((e) => e.name?.trim())
        .map((e) => ({
          name: e.name.trim(),
          sets: e.sets
            .map((s) => ({
              reps: s.reps === null || s.reps === undefined || isNaN(Number(s.reps)) ? null : Number(s.reps),
              weightKg: s.weightKg === null || s.weightKg === undefined || isNaN(Number(s.weightKg)) ? null : Number(s.weightKg),
              ...(s.done ? { done: true } : {}),
            }))
            .filter((s) => s.reps !== null || s.weightKg !== null),
        })),
    };
  } else {
    let distanceM: number | undefined;
    let durationS: number | undefined;
    try {
      const d = String(form.get("distance") ?? "").trim();
      distanceM = d ? parseDistance(/[a-z]/i.test(d) ? d : `${d}${w.sport === "swim" ? "m" : "km"}`) : undefined;
      const t = String(form.get("duration") ?? "").trim();
      durationS = t ? parseDuration(t) : undefined;
    } catch (e) {
      throw new Error((e as Error).message);
    }
    log = {
      kind: "endurance",
      distanceM,
      durationS,
      avgHr: numOrUndef(form.get("avgHr")),
      avgPower: numOrUndef(form.get("avgPower")),
      elevationM: numOrUndef(form.get("elevation")),
    };
  }

  const db = await getDb();
  await db
    .update(schema.workouts)
    .set({
      log,
      rpe: intOrNull(form.get("rpe"), 1, 10),
      feeling: intOrNull(form.get("feeling"), 1, 5),
      notes: String(form.get("notes") ?? "").trim() || null,
      status: "done",
      completedAt: w.completedAt ?? new Date(),
    })
    .where(eq(schema.workouts.id, id));
  refresh(id);
}

/** Add a one-off session (not from a cycle). */
export async function addWorkout(form: FormData) {
  const user = await requireUser();
  const date = String(form.get("date") ?? "");
  const sport = String(form.get("sport") ?? "other") as Sport;
  const title = String(form.get("title") ?? "").trim();
  if (!isISODate(date) || !SPORTS.includes(sport)) throw new Error("Invalid session");
  const plan: WorkoutPlan = sport === "gym" ? { kind: "gym", exercises: [] } : sport === "other" ? { kind: "free" } : { kind: "endurance" };
  const db = await getDb();
  const [w] = await db
    .insert(schema.workouts)
    .values({
      userId: user.id,
      plannedDate: date,
      date,
      position: 99,
      sport,
      title: title || { gym: "Strength", run: "Run", bike: "Ride", swim: "Swim", other: "Session" }[sport],
      description: String(form.get("description") ?? "").trim() || null,
      plan,
    })
    .returning({ id: schema.workouts.id });
  refresh();
  redirect(`/workout/${w.id}`);
}

export async function deleteWorkout(id: string) {
  const { w } = await owned(id);
  const db = await getDb();
  await db.delete(schema.workouts).where(eq(schema.workouts.id, id));
  refresh();
  redirect(`/?w=${w.date}`);
}

/** Add a one-off session from the Add sheet (no redirect; returns the new id). */
export async function addWorkoutQuick(input: { sport: string; title: string; date: string; target?: string; minutes?: number }) {
  const user = await requireUser();
  const sport = input.sport as Sport;
  if (!isISODate(input.date) || !SPORTS.includes(sport) || !input.title.trim()) throw new Error("Invalid session");
  const mins = Math.max(5, Math.min(600, Math.round(input.minutes ?? 45)));
  const plan: WorkoutPlan =
    sport === "gym" ? { kind: "gym", exercises: [] } : sport === "other" ? { kind: "free" } : { kind: "endurance", durationS: mins * 60, target: input.target?.trim() || undefined };
  const db = await getDb();
  const [w] = await db
    .insert(schema.workouts)
    .values({ userId: user.id, plannedDate: input.date, date: input.date, position: 99, sport, title: input.title.trim().slice(0, 80), description: sport === "gym" || sport === "other" ? input.target?.trim() || null : null, plan })
    .returning({ id: schema.workouts.id });
  refresh();
  return w.id;
}
