// Parse and format the human units used in cycle files.

/** "8km" | "8 km" | "1500m" | "10mi" | 8000 (metres) -> metres */
export function parseDistance(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return v;
  const m = String(v).trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(km|k|m|mi|miles?|yd)?$/);
  if (!m) throw new Error(`Unrecognised distance "${v}" (use e.g. 8km, 1500m, 5mi)`);
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "km":
    case "k":
      return Math.round(n * 1000);
    case "mi":
    case "mile":
    case "miles":
      return Math.round(n * 1609.344);
    case "yd":
      return Math.round(n * 0.9144);
    default:
      return Math.round(n);
  }
}

/** "45min" | "1h30" | "1h 30min" | "90s" | "1:30:00" | "25:00" | 45 (minutes) -> seconds */
export function parseDuration(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return Math.round(v * 60);
  const s = String(v).trim().toLowerCase().replace(/\s+/g, "");
  const clock = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock) {
    const [, h, mm, ss] = clock;
    return (h ? parseInt(h) * 3600 : 0) + parseInt(mm) * 60 + parseInt(ss);
  }
  const re = /(\d+(?:\.\d+)?)(h|hr|hrs|min|mins|m|s|sec)?/g;
  let total = 0;
  let matched = "";
  let lastUnit = "";
  for (const part of s.matchAll(re)) {
    matched += part[0];
    const n = parseFloat(part[1]);
    // "1h30" -> the trailing 30 means minutes
    const unit = part[2] ?? (lastUnit === "h" || lastUnit === "hr" || lastUnit === "hrs" ? "min" : "min");
    lastUnit = unit;
    if (unit.startsWith("h")) total += n * 3600;
    else if (unit === "s" || unit === "sec") total += n;
    else total += n * 60;
  }
  if (!matched || matched !== s) throw new Error(`Unrecognised duration "${v}" (use e.g. 45min, 1h30, 90s)`);
  return Math.round(total);
}

/** "80kg" | "80" | "175lb" -> kg; relative loads ("RPE 8", "75%") -> undefined */
export function parseLoadKg(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  const m = String(v).trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs)?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return m[2]?.startsWith("lb") ? Math.round(n * 0.4536 * 10) / 10 : n;
}

export function formatDistance(m?: number | null): string {
  if (!m) return "";
  return m >= 1000 ? `${+(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)} km` : `${m} m`;
}

export function formatDuration(s?: number | null): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
  if (sec) return `${m}:${String(sec).padStart(2, "0")}`;
  return `${m} min`;
}

/** Pace per km (run) or per 100 m (swim) or speed (bike). */
export function formatPace(sport: string, distanceM?: number | null, durationS?: number | null): string {
  if (!distanceM || !durationS) return "";
  if (sport === "bike") return `${((distanceM / 1000) / (durationS / 3600)).toFixed(1)} km/h`;
  const per = sport === "swim" ? 100 : 1000;
  const secs = Math.round(durationS / (distanceM / per));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} /${sport === "swim" ? "100m" : "km"}`;
}

/** Epley estimated one-rep max. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}
