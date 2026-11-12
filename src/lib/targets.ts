import "server-only";
import type { Race, Target, Workout } from "@/db/schema";
import { addDays, formatDay } from "./dates";
import { estimate1RM } from "./units";
import type { TargetView } from "./races";

type Ctx = { workouts: Workout[]; today: string; seasonStart: string | null; races: Pick<Race, "id" | "name" | "date">[] };

const done = (ws: Workout[]) => ws.filter((w) => w.status === "done");

function distanceOf(w: Workout): number {
  if (w.log?.kind === "endurance" && w.log.distanceM) return w.log.distanceM;
  if (w.plan.kind === "endurance" && w.plan.distanceM) return w.plan.distanceM;
  return 0;
}

/** Best estimated 1RM for an exercise (case-insensitive name match). */
export function bestE1rm(ws: Workout[], name: string): number | null {
  const key = name.trim().toLowerCase();
  let best = 0;
  for (const w of done(ws)) {
    if (w.log?.kind !== "gym") continue;
    for (const e of w.log.exercises) {
      if (e.name.trim().toLowerCase() !== key) continue;
      for (const s of e.sets) if (s.reps && s.weightKg) best = Math.max(best, estimate1RM(s.weightKg, s.reps));
    }
  }
  return best ? Math.round(best * 10) / 10 : null;
}

/** Fastest equivalent time over `meters`, from logged runs at least that long (Riegel scaling). */
export function bestRunTime(ws: Workout[], meters: number): number | null {
  let best: number | null = null;
  for (const w of done(ws)) {
    if (w.sport !== "run" || w.log?.kind !== "endurance") continue;
    const { distanceM: d, durationS: t } = w.log;
    if (!d || !t || d < meters * 0.98) continue;
    const eq = t * Math.pow(meters / d, 1.06);
    if (best === null || eq < best) best = eq;
  }
  return best === null ? null : Math.round(best);
}

export function exerciseNames(ws: Workout[]): string[] {
  const seen = new Map<string, string>();
  for (const w of ws) {
    const list = w.log?.kind === "gym" ? w.log.exercises : w.plan.kind === "gym" ? w.plan.exercises : [];
    for (const e of list) if (!seen.has(e.name.toLowerCase())) seen.set(e.name.toLowerCase(), e.name);
  }
  return [...seen.values()].sort();
}

export function consistency(ws: Workout[], today: string): number | null {
  const from = addDays(today, -27);
  const l = ws.filter((w) => w.date >= from && w.date <= today);
  if (!l.length) return null;
  return Math.round((l.filter((w) => w.status === "done").length / l.length) * 100);
}

/** Resolve "now" for each target. Auto kinds read the logged sessions; custom ones use the stored value. */
export function viewTargets(targets: Target[], c: Ctx): TargetView[] {
  return targets.map((t) => {
    let auto: number | null = null;
    let note = t.note;
    if (t.kind === "e1rm" && t.metricKey) {
      auto = bestE1rm(c.workouts, t.metricKey);
      note ??= "Best est. 1RM";
    } else if (t.kind === "volume") {
      const since = [c.seasonStart, t.createdAt.toISOString().slice(0, 10)].filter(Boolean).sort()[0]!;
      const km = done(c.workouts)
        .filter((w) => w.date >= since && w.date <= c.today && (t.metricKey === "all" || w.sport === t.metricKey))
        .reduce((x, w) => x + distanceOf(w) / 1000, 0);
      auto = Math.round(km * 10) / 10;
      note ??= `Since ${formatDay(since, { day: "numeric", month: "short" })}`;
    } else if (t.kind === "consistency") {
      auto = consistency(c.workouts, c.today);
      note ??= "Last 4 weeks";
    } else if (t.kind === "best10k" || t.kind === "best5k") {
      const b = bestRunTime(c.workouts, t.kind === "best10k" ? 10000 : 5000);
      // A time only counts once it beats where you started.
      auto = b !== null && b < t.startValue ? b : null;
      note ??= "Best logged run";
    }
    const race = t.raceId ? c.races.find((r) => r.id === t.raceId) ?? null : null;
    return {
      id: t.id,
      kind: t.kind,
      sport: t.sport,
      title: t.title,
      metricKey: t.metricKey,
      startValue: t.startValue,
      goalValue: t.goalValue,
      unit: t.unit,
      lowerIsBetter: t.lowerIsBetter,
      raceId: t.raceId,
      due: t.due ?? race?.date ?? null,
      note,
      now: auto ?? t.currentValue ?? t.startValue,
      auto: t.kind !== "custom",
      race: race ? { id: race.id, name: race.name, date: race.date } : null,
    };
  });
}

/** Values the Add target sheet shows as "now" for auto targets. */
export function autoNowFor(all: Workout[], today: string, seasonStart: string | null) {
  const kmSince = (sport: string) =>
    Math.round(
      done(all)
        .filter((w) => w.date >= (seasonStart ?? today) && w.date <= today && (sport === "all" || w.sport === sport))
        .reduce((x, w) => x + distanceOf(w) / 1000, 0) * 10,
    ) / 10;
  const names = exerciseNames(all);
  return {
    e1rm: Object.fromEntries(names.map((n) => [n, bestE1rm(all, n)])),
    consistency: consistency(all, today),
    best10k: bestRunTime(all, 10000),
    best5k: bestRunTime(all, 5000),
    volume: { swim: kmSince("swim"), bike: kmSince("bike"), run: kmSince("run"), all: kmSince("all") },
  };
}
