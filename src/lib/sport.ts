import type { Workout } from "@/db/schema";
import type { EnduranceStep } from "./plan-types";
import { formatDistance, formatDuration, formatPace } from "./units";

type W = Pick<Workout, "plan" | "log" | "sport" | "status">;

/** Rough minutes for a session, used for the day strip's load bars. */
export function estimateMinutes(w: W): number {
  const src = w.status === "done" && w.log?.kind === "endurance" ? w.log : w.plan.kind === "endurance" ? w.plan : null;
  if (src?.durationS) return Math.round(src.durationS / 60);
  if (src?.distanceM) {
    const km = src.distanceM / 1000;
    const perKm = { run: 5.75, bike: 2, swim: 20, gym: 6, other: 8 }[w.sport];
    return Math.round(km * perKm);
  }
  if (w.plan.kind === "gym") return Math.max(30, w.plan.exercises.reduce((t, e) => t + e.sets * 3, 0));
  return 45;
}

function stepAmount(s: EnduranceStep): string {
  return [formatDistance(s.distanceM), formatDuration(s.durationS)].filter(Boolean).join(" / ");
}

/** The metric line under a session title, e.g. "8 km · 5:50/km · Z2" or "4 exercises · 15 sets". */
export function targetLine(w: W): string {
  const p = w.plan;
  if (p.kind === "gym") {
    if (!p.exercises.length) return "";
    const first = p.exercises[0];
    const sets = p.exercises.reduce((t, e) => t + e.sets, 0);
    return `${first.name} ${first.sets} × ${first.reps}${first.load ? ` @ ${first.load}` : ""} · ${p.exercises.length} ex · ${sets} sets`;
  }
  if (p.kind === "endurance") {
    const main = p.steps?.find((s) => s.repeat && s.repeat > 1);
    const core = main ? `${main.repeat} × ${stepAmount(main)}${main.target ? ` @ ${main.target}` : ""}` : null;
    return [core ?? [formatDistance(p.distanceM), formatDuration(p.durationS)].filter(Boolean).join(" · "), !main ? p.target : null]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

/** The big number on today's hero card. */
export function heroStat(w: W): { value: string; unit: string } | null {
  const p = w.plan;
  if (p.kind === "endurance") {
    if (p.distanceM) {
      if (w.sport === "swim" || p.distanceM < 1000) return { value: p.distanceM.toLocaleString("en"), unit: "m" };
      return { value: String(+(p.distanceM / 1000).toFixed(1)), unit: "km" };
    }
    if (p.durationS) {
      const h = Math.floor(p.durationS / 3600);
      const m = Math.round((p.durationS % 3600) / 60);
      return h ? { value: `${h}:${String(m).padStart(2, "0")}`, unit: "h" } : { value: String(m), unit: "min" };
    }
  }
  if (p.kind === "gym" && p.exercises.length) return { value: String(p.exercises.reduce((t, e) => t + e.sets, 0)), unit: "sets" };
  return null;
}

const EASY = /warm|cool|easy|recover|drill|jog/i;

/** Interval steps (endurance) or exercises (gym), for the hero card. */
export function stepsFor(w: W): { text: string; note?: string; easy?: boolean }[] {
  const p = w.plan;
  if (p.kind === "endurance" && p.steps?.length) {
    return p.steps.map((s) => ({
      text: `${s.repeat && s.repeat > 1 ? `${s.repeat} × ` : ""}${stepAmount(s)}${s.target ? ` @ ${s.target}` : ""}`,
      note: s.label,
      easy: !!s.label && EASY.test(s.label) && !(s.repeat && s.repeat > 1 && /rep|main|interval/i.test(s.label)),
    }));
  }
  if (p.kind === "gym") {
    return p.exercises.map((e) => ({ text: `${e.sets} × ${e.reps}${e.load ? ` @ ${e.load}` : ""}`, note: e.name }));
  }
  return [];
}

export function slotFor(w: W): string {
  return `${estimateMinutes(w)} min`;
}

/** Summary once logged, e.g. "Logged 8.3 km · 46:10 · 5:34 /km" or "Logged 10 sets · 3,280 kg". */
export function loggedLine(w: W): string {
  const l = w.log;
  if (!l || w.status !== "done") return "";
  if (l.kind === "endurance") {
    const parts = [formatDistance(l.distanceM), formatDuration(l.durationS), formatPace(w.sport, l.distanceM, l.durationS)].filter(Boolean);
    return parts.length ? `Logged ${parts.join(" · ")}` : "";
  }
  const sets = l.exercises.reduce((t, e) => t + e.sets.length, 0);
  const tonnage = l.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + (x.reps ?? 0) * (x.weightKg ?? 0), 0), 0);
  return `Logged ${sets} sets${tonnage ? ` · ${Math.round(tonnage).toLocaleString("en")} kg` : ""}`;
}

/** Plain summary used in the import preview. */
export function planSummary(w: Pick<Workout, "plan">): string {
  const p = w.plan;
  if (p.kind === "gym") {
    if (!p.exercises.length) return "";
    return `${p.exercises.length} exercises · ${p.exercises.reduce((t, e) => t + e.sets, 0)} sets`;
  }
  if (p.kind === "endurance") return [formatDistance(p.distanceM), formatDuration(p.durationS), p.target].filter(Boolean).join(" · ");
  return "";
}
