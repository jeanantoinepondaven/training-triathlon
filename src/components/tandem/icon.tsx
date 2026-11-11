// Tandem's 24px line icon set (2px round stroke), from the design system.
import type { Sport } from "@/db/schema";

type Part = ["circle" | "path" | "rect", Record<string, string | number>];
const P: Record<string, Part[]> = {
  swim: [["circle", { cx: 17, cy: 6, r: 2 }], ["path", { d: "M6.5 11.5 11 8l3.5 3.5" }], ["path", { d: "M2.5 15.5c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.1-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.1 1.3" }], ["path", { d: "M2.5 20c1.6 0 1.6-1.3 3.2-1.3S7.3 20 8.9 20s1.6-1.3 3.1-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.1 1.3" }]],
  bike: [["circle", { cx: 5.5, cy: 16, r: 3.5 }], ["circle", { cx: 18.5, cy: 16, r: 3.5 }], ["path", { d: "M5.5 16 9 9h6.5l3 7M9 9l3 7h-6.5M12 16l3.5-7M8 6h3M14.5 6.5h2.5" }]],
  run: [["circle", { cx: 15.5, cy: 4.5, r: 2 }], ["path", { d: "M5 12.5 8.5 9.5 13 9l2.5 3.5 3.5 1M13 9l-2 5 3.5 2.5-1 5M11 14l-2.5 3.5H4.5" }]],
  gym: [["path", { d: "M6.5 6.5v11M3.5 9.5v5M17.5 6.5v11M20.5 9.5v5M6.5 12h11" }]],
  other: [["path", { d: "M12 3.5l1.8 6.7 6.7 1.8-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8z" }]],
  check: [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]],
  move: [["rect", { x: 3.5, y: 5, width: 17, height: 15, rx: 3 }], ["path", { d: "M3.5 9.5h17M8 3v4M16 3v4M9 14.5h6M13 12l2.5 2.5L13 17" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  minus: [["path", { d: "M5 12h14" }]],
  left: [["path", { d: "M14.5 5.5 8 12l6.5 6.5" }]],
  right: [["path", { d: "M9.5 5.5 16 12l-6.5 6.5" }]],
  up: [["path", { d: "M12 19V5M6 11l6-6 6 6" }]],
  down: [["path", { d: "M12 5v14M6 13l6 6 6-6" }]],
  close: [["path", { d: "M6 6l12 12M18 6 6 18" }]],
  offline: [["path", { d: "M2.5 9a14 14 0 0 1 5-2.9M21.5 9A14 14 0 0 0 12 5.5M5.5 12.5a9 9 0 0 1 3.5-2M18.5 12.5a9 9 0 0 0-3-1.8M9 16a4.5 4.5 0 0 1 6 0M3 3l18 18" }], ["circle", { cx: 12, cy: 19.5, r: 0.6 }]],
  lock: [["rect", { x: 5, y: 10.5, width: 14, height: 10, rx: 2.5 }], ["path", { d: "M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" }]],
  alert: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7.5v5.5M12 16.5v.01" }]],
  repeat: [["path", { d: "M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4.5v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 19.5v-4h4" }]],
  week: [["rect", { x: 3.5, y: 5, width: 17, height: 15, rx: 3 }], ["path", { d: "M3.5 9.5h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01" }]],
  progress: [["path", { d: "M4 20V13M10 20V8M16 20v-5M20 4l-5.5 5.5-3-3L4 10" }]],
  cycles: [["path", { d: "M4 6.5h16M4 12h16M4 17.5h10" }], ["circle", { cx: 18.5, cy: 17.5, r: 1.6 }]],
  trophy: [["path", { d: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z" }]],
  mood1: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8 17c1.2-2 6.8-2 8 0M8.5 9.5h.01M15.5 9.5h.01" }]],
  mood2: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8.5 16c1.5-1 5.5-1 7 0M8.5 9.5h.01M15.5 9.5h.01" }]],
  mood3: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8.5 15.5h7M8.5 9.5h.01M15.5 9.5h.01" }]],
  mood4: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8.5 14.5c1.5 1.2 5.5 1.2 7 0M8.5 9.5h.01M15.5 9.5h.01" }]],
  mood5: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8 13.5c1 3 7 3 8 0zM8.5 9.5h.01M15.5 9.5h.01" }]],
};

export type IconName = keyof typeof P;

export function Icon({ name, size, strokeWidth = 2, label, className }: { name: IconName; size?: number; strokeWidth?: number; label?: string; className?: string }) {
  return (
    <svg
      className={["td-icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      style={size ? { width: size, height: size } : undefined}
    >
      {(P[name] ?? P.other).map(([tag, attrs], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} />;
      })}
    </svg>
  );
}

export const SPORT_NAME: Record<Sport, string> = { swim: "Swim", bike: "Bike", run: "Run", gym: "Gym", other: "Other" };

export function SportIcon({ sport, tile = true, size }: { sport: Sport; tile?: boolean; size?: number }) {
  if (!tile)
    return (
      <span className={`td-s-${sport}`} style={{ color: `var(--${sport})`, display: "inline-flex" }}>
        <Icon name={sport} label={SPORT_NAME[sport]} size={size} />
      </span>
    );
  return (
    <span className={`td-sporttile td-s-${sport}`} title={SPORT_NAME[sport]}>
      <Icon name={sport} label={SPORT_NAME[sport]} />
    </span>
  );
}

export function SportTag({ sport, children }: { sport: Sport; children?: React.ReactNode }) {
  return (
    <span className={`td-sporttag td-label td-s-${sport}`}>
      <Icon name={sport} />
      {children ?? SPORT_NAME[sport]}
    </span>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  // Two offset pills: two athletes in neighbouring lanes. Lower pill follows `ink` so it flips in dark mode.
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect x="6" y="18" width="40" height="12" rx="6" fill="var(--lane)" />
      <rect x="18" y="34" width="40" height="12" rx="6" fill="var(--ink)" />
    </svg>
  );
}
