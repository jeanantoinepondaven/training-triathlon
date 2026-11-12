// Health: readiness, baselines and form from daily wellness rows (shared client + server).
import type { Wellness } from "@/db/schema";
import { addDays } from "./dates";

export type HealthDay = Omit<Wellness, "userId" | "updatedAt">;

export const CHECKIN = [
  { key: "soreness", label: "Soreness", opts: ["Low", "Avg", "High", "Extreme"] },
  { key: "fatigue", label: "Fatigue", opts: ["Low", "Avg", "High", "Extreme"] },
  { key: "mood", label: "Mood", opts: ["Great", "Good", "OK", "Grumpy"] },
  { key: "motivation", label: "Motivation", opts: ["Extreme", "High", "Avg", "Low"] },
  { key: "injury", label: "Injury", opts: ["None", "Niggle", "Poor", "Injured"] },
] as const;
export type CheckInKey = (typeof CHECKIN)[number]["key"];

type NumKey = "hrv" | "restingHR" | "sleepSecs" | "weight" | "vo2max" | "steps" | "bodyFat" | "spO2" | "respiration" | "sleepScore" | "avgSleepingHR" | "readiness";

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
};

/** Mean and spread of a metric over the 28 days before `day` (needs ≥ 5 values). */
export function baseline(days: HealthDay[], key: NumKey, day: string) {
  const from = addDays(day, -28);
  const v = days.filter((d) => d.date >= from && d.date < day && d[key] != null).map((d) => d[key] as number);
  if (v.length < 5) return null;
  return { mean: mean(v), sd: sd(v), n: v.length };
}

/** The latest value of a metric on or before `day`, within `within` days. */
export function latest(days: HealthDay[], key: NumKey | "ctl" | "atl", day: string, within = 3) {
  const from = addDays(day, -within);
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.date > day) continue;
    if (d.date < from) break;
    if (d[key] != null) return { date: d.date, v: d[key] as number };
  }
  return null;
}

export type Tone = "good" | "warning" | "serious";
export type Readiness = { tone: Tone; title: string; reasons: string[]; hint: string | null; hasData: boolean };

/** A plain-language readiness call for `day`: HRV and resting HR against your 28-day normal, sleep and the check-in. */
export function readiness(days: HealthDay[], day: string): Readiness {
  const flags: string[] = [];
  const good: string[] = [];
  let serious = false;
  const today = days.find((d) => d.date === day) ?? null;
  const hrv = latest(days, "hrv", day, 0);
  const hb = baseline(days, "hrv", day);
  if (hrv && hb) {
    const pct = Math.round(((hrv.v - hb.mean) / hb.mean) * 100);
    if (hrv.v < hb.mean - Math.max(hb.sd, hb.mean * 0.07)) flags.push(`HRV ${Math.abs(pct)}% below normal`);
    else good.push(pct >= 0 ? `HRV ${pct ? `${pct}% above` : "at"} normal` : "HRV in the normal range");
  }
  const rhr = latest(days, "restingHR", day, 0);
  const rb = baseline(days, "restingHR", day);
  if (rhr && rb) {
    const diff = Math.round(rhr.v - rb.mean);
    if (rhr.v > rb.mean + Math.max(3, rb.sd)) flags.push(`Resting HR ${diff} bpm above normal`);
    else good.push("Resting HR normal");
  }
  const sleep = latest(days, "sleepSecs", day, 0);
  if (sleep) {
    const h = sleep.v / 3600;
    if (h < 6) flags.push(`Short sleep (${fmtSleep(sleep.v)})`);
    else good.push(`Slept ${fmtSleep(sleep.v)}`);
  }
  if (today?.soreness && today.soreness >= 3) flags.push("Feeling sore");
  if (today?.fatigue && today.fatigue >= 3) flags.push("Feeling tired");
  if (today?.injury && today.injury >= 3) {
    flags.push("Injury reported");
    serious = true;
  }
  const hasData = !!(hrv || rhr || sleep || today?.soreness || today?.fatigue || today?.injury);
  if (!hasData) return { tone: "good", title: "No data for today yet", reasons: ["Wear the watch overnight, or do the check-in."], hint: null, hasData };
  if (serious || flags.length >= 2)
    return { tone: "serious", title: "Go easy today", reasons: flags, hint: "Swap intensity for an easy session or rest. One easy day now beats a lost week.", hasData };
  if (flags.length === 1) return { tone: "warning", title: "Train, but listen to your body", reasons: [...flags, ...good].slice(0, 3), hint: "Keep the session, drop the hardest reps if it feels off.", hasData };
  return { tone: "good", title: "Ready to train", reasons: good.slice(0, 3), hint: null, hasData };
}

/** intervals.icu form zones (form = fitness − fatigue). */
export function formZone(form: number): { label: string; tone: Tone | "info" } {
  if (form > 25) return { label: "Transition: losing fitness", tone: "warning" };
  if (form > 5) return { label: "Fresh: race-ready", tone: "good" };
  if (form > -10) return { label: "Grey zone: maintaining", tone: "info" };
  if (form > -30) return { label: "Optimal: building fitness", tone: "good" };
  return { label: "High risk: too much load", tone: "serious" };
}

export function fmtSleep(secs: number) {
  const m = Math.round(secs / 60);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Rolling mean over the previous `n` values that exist (for the HRV 7-day line). */
export function rolling(points: { date: string; v: number | null }[], n = 7) {
  return points.map((p, i) => {
    const w = points.slice(Math.max(0, i - n + 1), i + 1).filter((x) => x.v != null).map((x) => x.v as number);
    return { date: p.date, v: w.length >= Math.min(3, n) ? mean(w) : null };
  });
}
