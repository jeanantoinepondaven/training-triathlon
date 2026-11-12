"use client";

import { useState } from "react";
import { formatDay } from "@/lib/dates";

export type Series = {
  name: string;
  values: (number | null)[];
  /** line = main series · dash = second series · dots = raw daily readings behind a smoothed line · bars = diverging around zero */
  kind?: "line" | "dash" | "dots" | "bars";
};

const W = 340;
const PAD_R = 34;

/** Small time-series chart with a crosshair tooltip. One y-axis; dates are evenly spaced days. */
export function TrendChart({
  dates,
  series,
  fmt,
  height = 120,
  band,
  zero,
  marks = [],
  label,
}: {
  dates: string[];
  series: Series[];
  fmt: (v: number) => string;
  height?: number;
  band?: { lo: number; hi: number } | null;
  zero?: boolean;
  marks?: { date: string; label: string }[];
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  if (!all.length || dates.length < 2) return <div className="chart-empty">No data in this range yet.</div>;
  let lo = Math.min(...all, ...(band ? [band.lo] : []), ...(zero ? [0] : []));
  let hi = Math.max(...all, ...(band ? [band.hi] : []), ...(zero ? [0] : []));
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const pw = W - PAD_R;
  const step = pw / (dates.length - 1);
  const x = (i: number) => i * step;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      // Gaps (no reading that day) are bridged: health metrics like weight are sparse.
      if (v == null) return;
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const barW = Math.max(1.5, Math.min(8, step - 2));
  const main = series[0];
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(dates.length - 1, Math.round(px / step))));
  };
  const lastIdx = main.values.reduce<number>((li, v, i) => (v != null ? i : li), -1);
  const legend = series.filter((s) => s.kind !== "dots");

  return (
    <div className="chart tchart">
      {legend.length > 1 && (
        <div className="tc-legend">
          {legend.map((s) => (
            <span key={s.name} className={`lg k-${s.kind ?? "line"}`}>
              <i />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 -8 ${W} ${H + 26}`}
        role="img"
        aria-label={label}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
      >
        {band && <rect className="band" x={0} width={pw} y={y(band.hi)} height={Math.max(0, y(band.lo) - y(band.hi))} rx={4} />}
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={0} x2={pw} y1={y(t)} y2={y(t)} />
            <text x={W} y={y(t) + 4} textAnchor="end">
              {fmt(t)}
            </text>
          </g>
        ))}
        {zero && <line className="zero" x1={0} x2={pw} y1={y(0)} y2={y(0)} />}
        {marks.map((m) => {
          const i = dates.indexOf(m.date);
          return i < 0 ? null : (
            <g key={m.date}>
              <line className="mark" x1={x(i)} x2={x(i)} y1={0} y2={H} />
              <text className="marklbl" x={Math.min(x(i) + 3, pw - 20)} y={8}>
                {m.label}
              </text>
            </g>
          );
        })}
        {series.map((s) =>
          s.kind === "bars" ? (
            <g key={s.name}>
              {s.values.map((v, i) =>
                v == null ? null : <rect key={i} className={v >= 0 ? "bar-pos" : "bar-neg"} x={x(i) - barW / 2} width={barW} y={Math.min(y(v), y(0))} height={Math.max(1, Math.abs(y(v) - y(0)))} rx={Math.min(2, barW / 2)} />,
              )}
            </g>
          ) : s.kind === "dots" ? (
            <g key={s.name}>{s.values.map((v, i) => (v == null ? null : <circle key={i} className="raw" cx={x(i)} cy={y(v)} r={2.2} />))}</g>
          ) : (
            <path key={s.name} className={s.kind === "dash" ? "line s2" : "line"} d={path(s.values)} />
          ),
        )}
        {main.kind !== "bars" && lastIdx >= 0 && hover == null && <circle className="dot end" cx={x(lastIdx)} cy={y(main.values[lastIdx]!)} r={4} />}
        <text x={0} y={H + 18}>
          {formatDay(dates[0], { day: "numeric", month: "short" })}
        </text>
        <text x={pw} y={H + 18} textAnchor="end">
          {formatDay(dates[dates.length - 1], { day: "numeric", month: "short" })}
        </text>
        {hover != null && (
          <g>
            <line className="xhair" x1={x(hover)} x2={x(hover)} y1={0} y2={H} />
            {series.map((s) => {
              const v = s.values[hover];
              return v == null || s.kind === "bars" ? null : <circle key={s.name} className={s.kind === "dots" ? "dot raw-on" : "dot"} cx={x(hover)} cy={y(v)} r={4} />;
            })}
          </g>
        )}
        <rect x={0} y={-8} width={W} height={H + 26} fill="transparent" />
      </svg>
      {hover != null && (
        <div className="tc-tip hig-glass" style={{ left: `${Math.min(78, Math.max(4, (x(hover) / W) * 100))}%` }}>
          <b>{formatDay(dates[hover], { weekday: "short", day: "numeric", month: "short" })}</b>
          {series.map((s) => (
            <span key={s.name}>
              {s.name}: {s.values[hover] == null ? "–" : fmt(s.values[hover]!)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
