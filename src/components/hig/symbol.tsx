// SF Symbols-style glyphs from the Tandem HIG design system (24 grid, stroke = currentColor).
// Names follow SF Symbols so a native build can swap them 1:1.
import type { Sport } from "@/db/schema";

const P: Record<string, string> = {
  "pencil": "<path d=\"M4.5 19.5l1-4.6L15.6 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L9.1 18.5z\"/><path d=\"M13.6 6.8l3.6 3.6\"/>",
  "house": "<path d=\"M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z\"/>",
  "flag": "<path d=\"M5.5 21V4M5.5 4.5h12l-3 4 3 4h-12\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" class=\"f\"/>",
  "mappin": "<path d=\"M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.3\"/>",
  "slider.horizontal.3": "<path d=\"M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1\"/><circle cx=\"15\" cy=\"6.5\" r=\"2\"/><circle cx=\"9\" cy=\"12\" r=\"2\"/><circle cx=\"17\" cy=\"17.5\" r=\"2\"/>",
  "applewatch": "<rect x=\"6.5\" y=\"6\" width=\"11\" height=\"12\" rx=\"3.2\"/><path d=\"M8.8 6l.6-2.5h5.2l.6 2.5M8.8 18l.6 2.5h5.2l.6-2.5\"/><path d=\"M12 9.5V12l1.6 1.2\"/>",
  "arrow.triangle.2.circlepath": "<path d=\"M4.5 11a7.5 7.5 0 0 1 13-4.6L19.5 8.5M19.5 4.5v4h-4M19.5 13a7.5 7.5 0 0 1-13 4.6L4.5 15.5M4.5 19.5v-4h4\"/>",
  "chevron.left": "<path d=\"M14.5 5.5 8 12l6.5 6.5\"/>",
  "chevron.right": "<path d=\"M9.5 5.5 16 12l-6.5 6.5\"/>",
  "chevron.down": "<path d=\"M5.5 9.5 12 16l6.5-6.5\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "minus": "<path d=\"M5 12h14\"/>",
  "checkmark": "<path d=\"M5 12.5 9.8 17 19 7\"/>",
  "xmark": "<path d=\"M6.5 6.5l11 11M17.5 6.5l-11 11\"/>",
  "ellipsis": "<circle cx=\"5.5\" cy=\"12\" r=\"1.6\" class=\"f\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" class=\"f\"/><circle cx=\"18.5\" cy=\"12\" r=\"1.6\" class=\"f\"/>",
  "calendar": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"3.5\"/><path d=\"M3.5 10h17M8 3v4M16 3v4\"/>",
  "calendar.badge.clock": "<path d=\"M12 20H7a3.5 3.5 0 0 1-3.5-3.5v-8A3.5 3.5 0 0 1 7 5h10a3.5 3.5 0 0 1 3.5 3.5V11M3.5 10h17M8 3v4M16 3v4\"/><circle cx=\"17.5\" cy=\"17.5\" r=\"4\"/><path d=\"M17.5 15.6v2l1.3 1\"/>",
  "arrow.uturn.backward": "<path d=\"M9 14 4.5 9.5 9 5\"/><path d=\"M4.5 9.5h10a5 5 0 0 1 0 10H11\"/>",
  "square.on.square": "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"3\"/><path d=\"M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8\"/>",
  "chart.bar": "<path d=\"M5 20V13M10 20V8M15 20v-5M20 20V5\"/>",
  "chart.line.uptrend.xyaxis": "<path d=\"M4 4v16h16\"/><path d=\"m7.5 15 4-4.5 3 2.5 5-6\"/>",
  "square.stack": "<rect x=\"4\" y=\"9\" width=\"16\" height=\"11\" rx=\"3\"/><path d=\"M6.5 6h11M9 3h6\"/>",
  "figure.run": "<circle cx=\"15.5\" cy=\"4.3\" r=\"1.9\" class=\"f\"/><path d=\"M8 10.2 10.8 8l3 .5 2.2 3 2.8.8\"/><path d=\"m13.8 8.5-2.6 5.3 3.2 2.6-.9 4.6\"/><path d=\"m11.2 13.8-1.9 3.4-3.8.4\"/>",
  "figure.pool.swim": "<circle cx=\"17\" cy=\"7.3\" r=\"1.9\" class=\"f\"/><path d=\"M4.5 13.5 9.3 9.7l3.3 2.2 2.6-1.8\"/><path d=\"M9.3 9.7 12 6.5h3.2\"/><path d=\"M3 18.3c1.5 0 1.5-1.1 3-1.1s1.5 1.1 3 1.1 1.5-1.1 3-1.1 1.5 1.1 3 1.1 1.5-1.1 3-1.1 1.5 1.1 3 1.1\"/>",
  "bicycle": "<circle cx=\"6\" cy=\"15.5\" r=\"3.6\"/><circle cx=\"18\" cy=\"15.5\" r=\"3.6\"/><path d=\"M6 15.5 9 9.3h6l3 6.2M9 9.3l3 6.2 3-6.2M8 7.2h2.6M14.2 6.8h2\"/>",
  "dumbbell": "<path d=\"M7 12h10\"/><rect x=\"5\" y=\"7\" width=\"2.6\" height=\"10\" rx=\"1.3\"/><rect x=\"16.4\" y=\"7\" width=\"2.6\" height=\"10\" rx=\"1.3\"/><path d=\"M3 10v4M21 10v4\"/>",
  "stopwatch": "<circle cx=\"12\" cy=\"13.5\" r=\"7\"/><path d=\"M12 13.5V9.5M10 3h4M18.2 6.8l1.3-1.3\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>",
  "wifi.slash": "<path d=\"M3.5 9.2a12 12 0 0 1 4.3-2.7M12 6a12 12 0 0 1 8.5 3.2M6.7 12.5a7.4 7.4 0 0 1 3-1.9M14.6 11a7.4 7.4 0 0 1 2.7 1.5M10 15.8a3 3 0 0 1 4 0\"/><circle cx=\"12\" cy=\"18.6\" r=\"1.2\" class=\"f\"/><path d=\"M4.5 4.5l15 15\"/>",
  "lock": "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"3\"/><path d=\"M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5\"/>",
  "eye": "<path d=\"M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "flame": "<path d=\"M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.7-5.2 3.6-8.4.9 1.4 1.6 2.4 2.7 3 .4-2.4 1.3-4.6 3.2-6.4.3 3 2.5 5.2 2.5 9.2 0 4.4-2.5 8.2-6 8.2Z\"/>",
  "trophy": "<path d=\"M8 4h8v6a4 4 0 0 1-8 0V4ZM8 6H4.5a3 3 0 0 0 3.6 4.4M16 6h3.5a3 3 0 0 1-3.6 4.4M12 14v3.5M8.5 20h7M9.5 17.5h5\"/>",
  "heart": "<path d=\"M12 19.5S4 14.8 4 9.3A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 8 1.7c0 5.5-8 10.2-8 10.2Z\"/>",
  "bolt": "<path d=\"M13.5 3 5.5 13.5h6l-1 7.5 8-10.5h-6l1-7.5Z\"/>",
  "arrow.up.right": "<path d=\"M7 17 17 7M9 7h8v8\"/>",
  "arrow.down.right": "<path d=\"M7 7l10 10M17 9v8H9\"/>",
  "square.and.arrow.down": "<path d=\"M8 9.5H6.5a2.5 2.5 0 0 0-2.5 2.5v6a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-6a2.5 2.5 0 0 0-2.5-2.5H16M12 3v11M8.5 10.5 12 14l3.5-3.5\"/>",
  "person.2": "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.3a3 3 0 0 1 0 5.4M17 13.6a5.5 5.5 0 0 1 3.5 5.4\"/>",
  "minus.circle": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M8 12h8\"/>",
  "exclamationmark.circle": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5v5.5\"/><circle cx=\"12\" cy=\"16.3\" r=\"1.1\" class=\"f\"/>",
  "checkmark.circle.fill": "<circle cx=\"12\" cy=\"12\" r=\"9\" class=\"f\"/><path d=\"M8 12.3l2.8 2.7L16.2 9.4\" class=\"k\"/>",
  "trash": "<path d=\"M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.9 12a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8l.9-12M10 10.5v6M14 10.5v6\"/>",
  "arrow.right": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
  "face.1": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"9.2\" cy=\"10\" r=\"1\" class=\"f\"/><circle cx=\"14.8\" cy=\"10\" r=\"1\" class=\"f\"/><path d=\"M8.5 16.5c1.8-2.2 5.2-2.2 7 0\"/>",
  "face.2": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"9.2\" cy=\"10\" r=\"1\" class=\"f\"/><circle cx=\"14.8\" cy=\"10\" r=\"1\" class=\"f\"/><path d=\"M9 16c1.8-1 4.2-1 6 0\"/>",
  "face.3": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"9.2\" cy=\"10\" r=\"1\" class=\"f\"/><circle cx=\"14.8\" cy=\"10\" r=\"1\" class=\"f\"/><path d=\"M9 15.3h6\"/>",
  "face.4": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"9.2\" cy=\"10\" r=\"1\" class=\"f\"/><circle cx=\"14.8\" cy=\"10\" r=\"1\" class=\"f\"/><path d=\"M9 14.5c1.8 1 4.2 1 6 0\"/>",
  "face.5": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"9.2\" cy=\"10\" r=\"1\" class=\"f\"/><circle cx=\"14.8\" cy=\"10\" r=\"1\" class=\"f\"/><path d=\"M8.3 13.8c1.8 3 5.6 3 7.4 0Z\"/>"
};

export type SymbolName = keyof typeof P | string;

export function Symbol({ name, size = 20, weight, className, style }: { name: SymbolName; size?: number; weight?: "regular" | "semibold" | "bold"; className?: string; style?: React.CSSProperties }) {
  const cls = ["hig-sym", weight === "semibold" && "is-semibold", weight === "bold" && "is-bold", className].filter(Boolean).join(" ");
  return <svg className={cls} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={style} dangerouslySetInnerHTML={{ __html: P[name] ?? P["ellipsis"] }} />;
}

export const SPORTS: Record<Sport, { icon: string; label: string }> = {
  swim: { icon: "figure.pool.swim", label: "Swim" },
  bike: { icon: "bicycle", label: "Bike" },
  run: { icon: "figure.run", label: "Run" },
  gym: { icon: "dumbbell", label: "Gym" },
  other: { icon: "stopwatch", label: "Other" },
};
