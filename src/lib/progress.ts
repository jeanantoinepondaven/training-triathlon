import type { Sport, Workout } from "@/db/schema";
import { addDays, mondayOf } from "./dates";
import { estimate1RM } from "./units";

export type StrengthPoint = { date: string; e1rm: number; topKg: number; volume: number };
export type WeekVolume = { week: string } & Partial<Record<Sport, number>>;

const ENDURANCE: Sport[] = ["run", "bike", "swim"];

function actualEndurance(w: Workout) {
  if (w.log?.kind === "endurance") return { distanceM: w.log.distanceM, durationS: w.log.durationS };
  if (w.plan.kind === "endurance") return { distanceM: w.plan.distanceM, durationS: w.plan.durationS };
  return {};
}

export function computeProgress(all: Workout[], today: string, weeksBack = 12) {
  const done = all.filter((w) => w.status === "done");

  // Strength: best estimated 1RM per exercise per session.
  const strength: Record<string, StrengthPoint[]> = {};
  const display: Record<string, string> = {};
  for (const w of done) {
    if (w.log?.kind !== "gym") continue;
    for (const e of w.log.exercises) {
      const key = e.name.trim().toLowerCase();
      display[key] ??= e.name.trim();
      const valid = e.sets.filter((s) => s.reps && s.weightKg);
      if (!valid.length) continue;
      const pt: StrengthPoint = {
        date: w.date,
        e1rm: Math.max(...valid.map((s) => estimate1RM(s.weightKg!, s.reps!))),
        topKg: Math.max(...valid.map((s) => s.weightKg!)),
        volume: Math.round(valid.reduce((t, s) => t + s.weightKg! * s.reps!, 0)),
      };
      (strength[key] ??= []).push(pt);
    }
  }
  const exercises = Object.entries(strength)
    .map(([k, pts]) => {
      const sorted = pts.sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0].e1rm;
      const best = Math.max(...sorted.map((p) => p.e1rm));
      return { key: k, name: display[k], points: sorted, best, first, change: first ? Math.round(((best - first) / first) * 1000) / 10 : 0 };
    })
    .sort((a, b) => b.points.length - a.points.length);

  // Weekly endurance volume + adherence.
  const thisMonday = mondayOf(today);
  const weeks = Array.from({ length: weeksBack }, (_, i) => addDays(thisMonday, -7 * (weeksBack - 1 - i)));
  const distance: WeekVolume[] = weeks.map((week) => ({ week }));
  const time: WeekVolume[] = weeks.map((week) => ({ week }));
  const adherence = weeks.map((week) => ({ week, planned: 0, done: 0, skipped: 0 }));
  for (const w of all) {
    const i = weeks.indexOf(mondayOf(w.date));
    if (i < 0) continue;
    if (w.date <= today) {
      adherence[i].planned++;
      if (w.status === "done") adherence[i].done++;
      if (w.status === "skipped") adherence[i].skipped++;
    }
    if (w.status !== "done") continue;
    const a = actualEndurance(w);
    if (ENDURANCE.includes(w.sport) && a.distanceM) distance[i][w.sport] = Math.round(((distance[i][w.sport] ?? 0) + a.distanceM / 1000) * 10) / 10;
    const hours = (a.durationS ?? 0) / 3600 || (w.sport === "gym" ? 1 : 0); // gym without time ≈ 1h
    if (hours) time[i][w.sport] = Math.round(((time[i][w.sport] ?? 0) + hours) * 10) / 10;
  }

  // Records.
  const records: { label: string; value: string; date: string; sport: Sport }[] = [];
  for (const sport of ENDURANCE) {
    const ws = done.filter((w) => w.sport === sport).map((w) => ({ w, ...actualEndurance(w) })).filter((x) => x.distanceM);
    if (!ws.length) continue;
    const longest = ws.reduce((a, b) => (b.distanceM! > a.distanceM! ? b : a));
    records.push({ sport, label: `Longest ${sport}`, value: `${(longest.distanceM! / 1000).toFixed(1)} km`, date: longest.w.date });
    const minDist = sport === "swim" ? 400 : sport === "run" ? 3000 : 10000;
    const timed = ws.filter((x) => x.durationS && x.distanceM! >= minDist && x.w.log?.kind === "endurance");
    if (timed.length) {
      const fastest = timed.reduce((a, b) => (b.distanceM! / b.durationS! > a.distanceM! / a.durationS! ? b : a));
      const per = sport === "swim" ? 100 : 1000;
      const secs = Math.round(fastest.durationS! / (fastest.distanceM! / per));
      records.push({
        sport,
        label: `Fastest ${sport}`,
        value: sport === "bike" ? `${((fastest.distanceM! / 1000) / (fastest.durationS! / 3600)).toFixed(1)} km/h` : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} /${sport === "swim" ? "100m" : "km"}`,
        date: fastest.w.date,
      });
    }
  }

  const totals = {
    sessions: done.length,
    planned: all.filter((w) => w.date <= today).length,
  };

  return { exercises, distance, time, adherence, records, totals };
}
