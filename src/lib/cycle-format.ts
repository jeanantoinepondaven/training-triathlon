import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";
import { SPORTS, type Sport } from "@/db/schema";
import { DAY_KEYS, addDays, isISODate, mondayOf } from "./dates";
import { parseDistance, parseDuration, parseLoadKg } from "./units";
import type { EnduranceStep, GymExercise, WorkoutPlan } from "./plan-types";

/*
 * Cycle file format (YAML). See CYCLE_FORMAT.md for the full reference.
 *
 * name: Block 3 – Base
 * start: 2026-11-16        # any date; week 1 starts on that week's Monday
 * goal: Build aerobic base # optional
 * weeks:
 *   - week: 1
 *     sessions:
 *       - day: mon
 *         sport: gym
 *         title: Lower A
 *         exercises:
 *           - { name: Back squat, sets: 4, reps: 6, load: 80kg }
 *       - day: tue
 *         sport: run
 *         title: Easy run
 *         distance: 8km
 *         target: 5:45/km Z2
 */

const num = z.union([z.number(), z.string()]);

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.coerce.number().int().positive(),
  reps: num.transform(String),
  load: num.optional().transform((v) => (v === undefined ? undefined : String(v))),
  rest: num.optional().transform((v) => (v === undefined ? undefined : String(v))),
  notes: z.string().optional(),
});

const stepSchema = z.object({
  label: z.string().optional(),
  repeat: z.coerce.number().int().positive().optional(),
  distance: num.optional(),
  duration: num.optional(),
  target: num.optional().transform((v) => (v === undefined ? undefined : String(v))),
});

const sessionSchema = z.object({
  day: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 3) : v), z.enum(DAY_KEYS, { message: `day must be one of ${DAY_KEYS.join(", ")}` })),
  sport: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(SPORTS, { message: `sport must be one of ${SPORTS.join(", ")}` })),
  title: z.string().optional(),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
  distance: num.optional(),
  duration: num.optional(),
  target: num.optional().transform((v) => (v === undefined ? undefined : String(v))),
  steps: z.array(stepSchema).optional(),
});

const cycleSchema = z.object({
  name: z.string().min(1),
  start: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
  goal: z.string().optional(),
  weeks: z
    .array(
      z.object({
        week: z.coerce.number().int().positive(),
        focus: z.string().optional(),
        sessions: z.array(sessionSchema).default([]),
      }),
    )
    .min(1),
});

export type ParsedWorkout = {
  week: number;
  date: string;
  position: number;
  sport: Sport;
  title: string;
  description?: string;
  plan: WorkoutPlan;
};

export type ParsedCycle = {
  name: string;
  goal?: string;
  startDate: string;
  weeks: number;
  weekFocus: Record<number, string>;
  workouts: ParsedWorkout[];
};

export type ParseResult = { ok: true; cycle: ParsedCycle } | { ok: false; errors: string[] };

const DEFAULT_TITLES: Record<Sport, string> = {
  gym: "Strength",
  run: "Run",
  bike: "Ride",
  swim: "Swim",
  other: "Session",
};

function pathToString(path: PropertyKey[]): string {
  return path
    .map((p, i) => (typeof p === "number" ? `[${p + 1}]` : `${i ? "." : ""}${String(p)}`))
    .join("");
}

export function parseCycle(source: string): ParseResult {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (e) {
    const msg = e instanceof YAMLParseError ? e.message : String(e);
    return { ok: false, errors: [`YAML syntax error: ${msg}`] };
  }

  const res = cycleSchema.safeParse(raw);
  if (!res.success) {
    return {
      ok: false,
      errors: res.error.issues.map((i) => `${pathToString(i.path) || "(root)"}: ${i.message}`),
    };
  }
  const c = res.data;
  if (!isISODate(c.start)) return { ok: false, errors: [`start: "${c.start}" must be a date like 2026-11-16`] };

  const errors: string[] = [];
  const workouts: ParsedWorkout[] = [];
  const monday = mondayOf(c.start);
  const seen = new Set<number>();

  c.weeks.forEach((w, wi) => {
    if (seen.has(w.week)) errors.push(`weeks[${wi + 1}]: week ${w.week} appears twice`);
    seen.add(w.week);
    const perDay = new Map<string, number>();

    w.sessions.forEach((s, si) => {
      const where = `week ${w.week}, session ${si + 1} (${s.day})`;
      const date = addDays(monday, (w.week - 1) * 7 + DAY_KEYS.indexOf(s.day));
      const position = perDay.get(date) ?? 0;
      perDay.set(date, position + 1);
      try {
        workouts.push({
          week: w.week,
          date,
          position,
          sport: s.sport,
          title: s.title ?? DEFAULT_TITLES[s.sport],
          description: s.description,
          plan: buildPlan(s),
        });
      } catch (e) {
        errors.push(`${where}: ${(e as Error).message}`);
      }
    });
  });

  if (errors.length) return { ok: false, errors };
  const weeks = Math.max(...c.weeks.map((w) => w.week));
  const weekFocus = Object.fromEntries(c.weeks.filter((w) => w.focus).map((w) => [w.week, w.focus!]));
  return { ok: true, cycle: { name: c.name, goal: c.goal, startDate: monday, weeks, weekFocus, workouts } };
}

function buildPlan(s: z.infer<typeof sessionSchema>): WorkoutPlan {
  if (s.sport === "gym" || (s.sport === "other" && s.exercises?.length)) {
    if (!s.exercises?.length) {
      if (s.description) return { kind: "free" };
      throw new Error("gym sessions need an `exercises` list (or a description)");
    }
    const exercises: GymExercise[] = s.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      load: e.load,
      loadKg: parseLoadKg(e.load),
      rest: e.rest,
      notes: e.notes,
    }));
    return { kind: "gym", exercises };
  }
  if (s.sport === "other" && !s.distance && !s.duration && !s.steps) return { kind: "free" };

  const steps: EnduranceStep[] | undefined = s.steps?.map((st) => ({
    label: st.label,
    repeat: st.repeat,
    distanceM: parseDistance(st.distance),
    durationS: parseDuration(st.duration),
    target: st.target,
  }));
  let distanceM = parseDistance(s.distance);
  let durationS = parseDuration(s.duration);
  // If only steps are given, total them up so volume charts still work.
  if (steps && distanceM === undefined && steps.every((st) => st.distanceM)) {
    distanceM = steps.reduce((t, st) => t + (st.distanceM ?? 0) * (st.repeat ?? 1), 0);
  }
  if (steps && durationS === undefined && steps.every((st) => st.durationS)) {
    durationS = steps.reduce((t, st) => t + (st.durationS ?? 0) * (st.repeat ?? 1), 0);
  }
  return { kind: "endurance", distanceM, durationS, target: s.target, steps };
}

export const EXAMPLE_CYCLE = `name: Block 1 – Base
start: 2026-11-16        # week 1 starts on the Monday of this date's week
goal: Build aerobic base + strength foundation

weeks:
  - week: 1
    focus: Volume
    sessions:
      - day: mon
        sport: gym
        title: Lower body A
        exercises:
          - { name: Back squat, sets: 4, reps: 6, load: 80kg, rest: 2min }
          - { name: Romanian deadlift, sets: 3, reps: 8, load: 60kg }
          - { name: Walking lunge, sets: 3, reps: 10, load: RPE 7 }
      - day: tue
        sport: run
        title: Easy run
        distance: 8km
        target: 5:45/km · Z2
      - day: wed
        sport: swim
        title: Technique
        distance: 2000m
        steps:
          - { label: Warm-up, distance: 400m }
          - { label: Drills, repeat: 8, distance: 50m, target: catch-up }
          - { label: Main, repeat: 4, distance: 200m, target: "1:50/100m" }
          - { label: Cool-down, distance: 400m }
      - day: thu
        sport: run
        title: Intervals
        steps:
          - { label: Warm-up, duration: 15min }
          - { label: 1 km reps, repeat: 6, distance: 1km, target: "4:10/km" }
          - { label: Cool-down, duration: 10min }
      - day: sat
        sport: bike
        title: Long ride
        duration: 2h30
        target: Z2 · 180–200 W

  - week: 2
    sessions:
      - day: mon
        sport: gym
        title: Lower body A
        exercises:
          - { name: Back squat, sets: 4, reps: 6, load: 82.5kg }
          - { name: Romanian deadlift, sets: 3, reps: 8, load: 62.5kg }
      - day: wed
        sport: run
        title: Tempo
        duration: 50min
        target: 20 min @ 4:35/km
      - day: sun
        sport: run
        title: Long run
        distance: 16km
        target: Z2
`;
