// Races and targets: shared helpers (client + server).
import type { Race, Sport, Target } from "@/db/schema";
import { addDays, diffDays, mondayOf } from "./dates";

export type RaceKind = Race["kind"];
export type Leg = "swim" | "bike" | "run";

export const LEGS: Record<string, [Sport, string][]> = {
  Sprint: [["swim", "750 m"], ["bike", "20 km"], ["run", "5 km"]],
  Olympic: [["swim", "1.5 km"], ["bike", "40 km"], ["run", "10 km"]],
  "Half (70.3)": [["swim", "1.9 km"], ["bike", "90 km"], ["run", "21.1 km"]],
  Full: [["swim", "3.8 km"], ["bike", "180 km"], ["run", "42.2 km"]],
  "5 km": [["run", "5 km"]],
  "10 km": [["run", "10 km"]],
  "Half marathon": [["run", "21.1 km"]],
  Marathon: [["run", "42.2 km"]],
  "Gran fondo": [["bike", "120 km"]],
  "Time trial": [["bike", "20 km"]],
  "1.5 km open water": [["swim", "1.5 km"]],
  "3.8 km open water": [["swim", "3.8 km"]],
};
export const KIND_PRESETS: Record<RaceKind, string[]> = {
  tri: ["Sprint", "Olympic", "Half (70.3)", "Full"],
  run: ["5 km", "10 km", "Half marathon", "Marathon"],
  bike: ["Gran fondo", "Time trial"],
  swim: ["1.5 km open water", "3.8 km open water"],
};
export const KIND_WORD: Record<RaceKind, string> = { tri: "Triathlon", run: "Run", bike: "Bike", swim: "Swim" };
export const TAPER_DAYS = { A: 14, B: 7, C: 0 } as const;

type R = Pick<Race, "date" | "priority" | "dist" | "kind" | "who">;

export function taperStart(r: Pick<Race, "date" | "priority">): string | null {
  const d = TAPER_DAYS[r.priority];
  return d ? addDays(mondayOf(r.date), -(d - 7)) : null;
}
export function raceLegs(r: Pick<Race, "dist" | "kind">): [Sport, string][] {
  return LEGS[r.dist] ?? [[r.kind === "tri" ? "other" : r.kind, r.dist]];
}
export function racesFor<T extends Pick<Race, "who">>(races: T[], userId: string): T[] {
  return races.filter((r) => r.who === "both" || r.who === userId);
}
export function upcoming<T extends R>(races: T[], userId: string, today: string): T[] {
  return racesFor(races, userId)
    .filter((r) => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}
/** The next A race, else the next race. */
export function goalRace<T extends R>(races: T[], userId: string, today: string): T | null {
  const u = upcoming(races, userId, today);
  return u.find((r) => r.priority === "A") ?? u[0] ?? null;
}
export const daysTo = (today: string, d: string) => diffDays(d, today);

/** "36:45" → 2205, "1:20:00" → 4800, "45" → 2700 (minutes). */
export function parseTime(v: string | null | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (!s.includes(":")) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
  }
  const parts = s.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p) || p < 0) || parts.length > 3) return null;
  return parts.reduce((t, p) => t * 60 + p, 0);
}
export function fmtTime(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/* ---------------- Targets ---------------- */

export type TargetView = Pick<Target, "id" | "kind" | "sport" | "title" | "metricKey" | "startValue" | "goalValue" | "unit" | "lowerIsBetter" | "raceId" | "due" | "note"> & {
  now: number;
  auto: boolean;
  race?: { id: string; name: string; date: string } | null;
};

export const TARGET_KIND_WORD: Record<Target["kind"], string> = {
  custom: "Custom",
  e1rm: "Strength",
  volume: "Volume",
  consistency: "Consistency",
  best10k: "10 km time",
  best5k: "5 km time",
};

export function tPct(t: Pick<TargetView, "startValue" | "now" | "goalValue" | "lowerIsBetter">): number {
  const span = t.goalValue - t.startValue;
  if (!span) return t.lowerIsBetter ? (t.now <= t.goalValue ? 1 : 0) : t.now >= t.goalValue ? 1 : 0;
  return Math.max(0, Math.min(1, (t.now - t.startValue) / span));
}
export function tVal(t: Pick<TargetView, "lowerIsBetter" | "unit">, v: number): string {
  if (t.lowerIsBetter && (t.unit === "time" || !t.unit)) return fmtTime(v);
  const n = Math.abs(v % 1) > 0.05 ? v.toFixed(1) : String(Math.round(v));
  if (!t.unit) return n;
  return t.unit === "%" ? `${n}%` : `${n} ${t.unit}`;
}
export function countdownTxt(n: number): string {
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : `${n} days`;
}

/** The season's placeholder races from the plan generator (scripts/season/generate.py EVENTS). */
export const SEASON_RACES: { name: string; date: string; kind: RaceKind; dist: string; priority: "A" | "B" | "C"; note: string }[] = [
  { name: "B race: sprint", date: "2027-05-16", kind: "tri", dist: "Sprint", priority: "B", note: "Placeholder date from the season plan (block 7, week 4). Change it once the calendar is out." },
  { name: "B race: Olympic", date: "2027-06-13", kind: "tri", dist: "Olympic", priority: "B", note: "Placeholder date from the season plan (block 8, week 4)." },
  { name: "A race 1: Olympic / national ranking", date: "2027-07-11", kind: "tri", dist: "Olympic", priority: "A", note: "Placeholder date from the season plan (block 9, race week)." },
  { name: "Sprint, draft-legal", date: "2027-08-08", kind: "tri", dist: "Sprint", priority: "C", note: "Optional. Placeholder date from the season plan (block 10, week 4)." },
  { name: "A race 2: national selection", date: "2027-09-05", kind: "tri", dist: "Olympic", priority: "A", note: "Season goal. Placeholder date from the season plan (block 11, race week)." },
];
