// Tandem session → intervals.icu planned workout (native workout text), and
// intervals.icu activity type → Tandem sport. Pure functions, unit-tested in scripts/test-intervals.ts.
//
// Syntax (intervals.icu Workout Builder): "- [cue] [duration|distance] [target]", "m" = minutes,
// "mtr" = metres, repeats as a "Main 6x" line with a blank line before and after the block.
import type { Sport, Workout } from "@/db/schema";
import type { EnduranceStep } from "./plan-types";

type W = Pick<Workout, "sport" | "title" | "plan" | "description">;

export function eventType(w: Pick<Workout, "sport" | "title">): string {
  if (w.sport === "swim") return "Swim";
  if (w.sport === "bike") return /indoor|trainer|zwift/i.test(w.title) ? "VirtualRide" : "Ride";
  if (w.sport === "run") return "Run";
  if (w.sport === "gym") return "WeightTraining";
  return "Workout";
}

/** Only structured endurance sessions are worth putting on the watch. */
export function canSendToWatch(w: Pick<Workout, "sport" | "title" | "plan">): boolean {
  return (w.sport === "swim" || w.sport === "bike" || w.sport === "run") && w.plan.kind === "endurance" && !/football/i.test(w.title);
}

export function fmtDuration(sec: number): string {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h ? `${h}h` : ""}${m ? `${m}m` : ""}${s ? `${s}s` : ""}` || "0s";
}

export function fmtDistance(m: number, sport: Sport): string {
  if (sport !== "swim" && m >= 1000) return `${+(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}mtr`;
}

const PACE = String.raw`(\d{1,2}:\d{2})`;

/** Turn our free-text target ("3:40–3:43/km, 2 min jog", "88–93% FTP", "Z2 · 65–75% FTP") into an intervals.icu target. */
export function target(text: string | undefined, sport: Sport): string {
  if (!text) return "";
  const t = text.replace(/[–—]/g, "-");
  const unit = sport === "swim" ? "/100m" : "/km";
  const range = t.match(new RegExp(`${PACE}\\s*-\\s*${PACE}\\s*(\\/km|\\/100m)`));
  if (range && sport !== "bike") return `${range[1]}${range[3]}-${range[2]}${range[3]} Pace`;
  const single = t.match(new RegExp(`${PACE}\\s*(\\/km|\\/100m)`));
  if (single && sport !== "bike") return `${single[1]}${single[2]} Pace`;
  if (sport === "bike") {
    const pr = t.match(/(\d{2,3})\s*-\s*(\d{2,3})\s*%/);
    if (pr) return `${pr[1]}-${pr[2]}%`;
    const ps = t.match(/(\d{2,3})\s*%\s*FTP/i);
    if (ps) return `${ps[1]}%`;
  }
  const z = t.match(/\bZ([1-5])(?:\s*-\s*Z?([1-5]))?\b/);
  if (z) {
    const zone = z[2] ? `Z${z[1]}-Z${z[2]}` : `Z${z[1]}`;
    return sport === "bike" ? zone : `${zone} Pace`;
  }
  void unit;
  return "";
}

/** Recovery between reps, from text like "2 min jog", "90s jog", "2:30 jog", "15s rest", "walk back 2–3 min". */
export function recovery(text: string | undefined): number | null {
  if (!text) return null;
  const t = text.replace(/[–—]/g, "-");
  let m = t.match(/(\d+)\s*-\s*(\d+)\s*min/);
  if (m && /walk|jog|easy|rest|back/i.test(t)) return +m[2] * 60;
  m = t.match(/(\d{1,2}):(\d{2})\s*(jog|easy|rest|walk)/i);
  if (m) return +m[1] * 60 + +m[2];
  m = t.match(/(\d+)\s*min\s*(jog|easy|rest|walk|recovery)/i);
  if (m) return +m[1] * 60;
  m = t.match(/(\d+)\s*s\s*(jog|easy|rest|walk|recovery)/i);
  if (m) return +m[1];
  return null;
}

/** Cue text shown on the watch; digits and units are dropped so the parser can't mistake them for a step length. */
function cue(label: string | undefined): string {
  return (label ?? "")
    .replace(/[0-9]+(\.[0-9]+)?\s*(km|mtr|m|min|s|x|×)?\b/gi, "")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

function amount(s: { distanceM?: number; durationS?: number }, sport: Sport): string {
  if (s.distanceM) return fmtDistance(s.distanceM, sport);
  if (s.durationS) return fmtDuration(s.durationS);
  return "";
}

function easyTarget(sport: Sport) {
  return sport === "bike" ? "Z1" : sport === "run" ? "Z1 Pace" : "";
}

function line(c: string, amt: string, tgt: string) {
  return `- ${[c, amt, tgt].filter(Boolean).join(" ")}`;
}

/** The intervals.icu "description": a short note followed by the structured steps. */
export function workoutText(w: W): string {
  const p = w.plan;
  const out: string[] = [];
  if (p.kind !== "endurance") {
    if (w.description) out.push(w.description);
    return out.join("\n");
  }
  if (p.target) out.push(`Target: ${p.target}`);
  if (w.description) out.push(w.description);
  if (out.length) out.push("");

  const steps: EnduranceStep[] = p.steps ?? [];
  if (!steps.length) {
    const amt = amount(p, w.sport);
    // "Z2 with 4 × 10 min @ race effort": the whole session is Z2; the efforts are in the note above.
    const main = (p.target ?? "").split(/\bwith\b/i)[0];
    if (amt) out.push(line("", amt, target(main, w.sport) || (w.sport === "swim" ? "" : w.sport === "bike" ? "Z2" : "Z2 Pace")));
    return out.join("\n").trim();
  }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const reps = s.repeat ?? 1;
    if (reps > 1) {
      // Group a following step with the same repeat count that continues it ("…then 200 m kick").
      const block = [s];
      while (steps[i + 1] && (steps[i + 1].repeat ?? 1) === reps && /^(…|\.\.\.|then)/i.test(steps[i + 1].label ?? "")) block.push(steps[++i]);
      if (out.length && out[out.length - 1] !== "") out.push("");
      const c = cue(s.label);
      out.push(`${!c || /^(reps?|main|set)$/i.test(c) ? "Main" : c} ${reps}x`);
      for (const b of block) {
        out.push(line("", amount(b, w.sport), target(b.target, w.sport)));
        const rec = recovery(b.target);
        if (rec) out.push(line("Recovery", fmtDuration(rec), easyTarget(w.sport)));
      }
      out.push("");
    } else {
      const c = cue(s.label);
      const t = target(s.target, w.sport) || (/warm|cool/i.test(s.label ?? "") ? easyTarget(w.sport) : "");
      const amt = amount(s, w.sport);
      if (amt) out.push(line(c, amt, t));
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** intervals.icu activity → Tandem sport ("football" is a run in Tandem; snowboard is "other"). */
export function activitySport(type: string | undefined): { sport: Sport; football?: boolean; snow?: boolean } | null {
  const t = type ?? "";
  if (/^(Run|VirtualRun|TrailRun|Treadmill)/i.test(t)) return { sport: "run" };
  if (/Soccer|Football/i.test(t)) return { sport: "run", football: true };
  if (/Ride|Cycling|Velomobile|Handcycle/i.test(t)) return { sport: "bike" };
  if (/Swim/i.test(t)) return { sport: "swim" };
  if (/WeightTraining|Crossfit|Workout|HighIntensityIntervalTraining|Strength/i.test(t)) return { sport: "gym" };
  if (/Snowboard|AlpineSki|BackcountrySki/i.test(t)) return { sport: "other", snow: true };
  return null;
}
