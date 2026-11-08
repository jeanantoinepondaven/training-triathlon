import type { Sport } from "@/db/schema";
import type { Workout } from "@/db/schema";
import { formatDistance, formatDuration } from "./units";

export const SPORT_LABEL: Record<Sport, string> = {
  gym: "Gym",
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  other: "Other",
};

/** Tailwind classes per sport (kept literal so Tailwind picks them up). */
export const SPORT_STYLE: Record<Sport, { dot: string; text: string; border: string; bg: string }> = {
  gym: { dot: "bg-gym", text: "text-gym", border: "border-l-gym", bg: "bg-gym/10" },
  run: { dot: "bg-run", text: "text-run", border: "border-l-run", bg: "bg-run/10" },
  bike: { dot: "bg-bike", text: "text-bike", border: "border-l-bike", bg: "bg-bike/10" },
  swim: { dot: "bg-swim", text: "text-swim", border: "border-l-swim", bg: "bg-swim/10" },
  other: { dot: "bg-other", text: "text-other", border: "border-l-other", bg: "bg-other/10" },
};

/** One-line summary of the plan, e.g. "4 exercises · 15 sets" or "8 km · 5:45/km Z2". */
export function planSummary(w: Pick<Workout, "plan">): string {
  const p = w.plan;
  if (p.kind === "gym") {
    if (!p.exercises.length) return "";
    const sets = p.exercises.reduce((t, e) => t + e.sets, 0);
    return `${p.exercises.length} exercise${p.exercises.length > 1 ? "s" : ""} · ${sets} sets`;
  }
  if (p.kind === "endurance") {
    return [formatDistance(p.distanceM), formatDuration(p.durationS), p.target].filter(Boolean).join(" · ");
  }
  return "";
}

export function logSummary(w: Pick<Workout, "log" | "sport">): string {
  const l = w.log;
  if (!l) return "";
  if (l.kind === "endurance") return [formatDistance(l.distanceM), formatDuration(l.durationS)].filter(Boolean).join(" · ");
  const sets = l.exercises.reduce((t, e) => t + e.sets.length, 0);
  const tonnage = l.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + (x.reps ?? 0) * (x.weightKg ?? 0), 0), 0);
  return [`${sets} sets`, tonnage ? `${Math.round(tonnage).toLocaleString("en")} kg lifted` : ""].filter(Boolean).join(" · ");
}
