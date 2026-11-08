"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StrengthPoint, WeekVolume } from "@/lib/progress";

// Mid-tone colours that read on both light and dark backgrounds.
const COLORS = { gym: "#8b5cf6", run: "#f97316", bike: "#0ea5e9", swim: "#14b8a6", other: "#64748b" } as const;
const LABELS = { gym: "Gym", run: "Run", bike: "Bike", swim: "Swim", other: "Other" } as const;

const short = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const axis = { fontSize: 11, fill: "currentColor" };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--text)" };

export function StrengthChart({ exercises }: { exercises: { key: string; name: string; points: StrengthPoint[]; best: number; change: number }[] }) {
  const [sel, setSel] = useState(exercises[0]?.key);
  const ex = exercises.find((e) => e.key === sel) ?? exercises[0];
  if (!ex) return <p className="text-sm text-muted">Log a gym session with reps and weights to see your strength curve.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {exercises.map((e) => (
          <button key={e.key} onClick={() => setSel(e.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${e.key === ex.key ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>{e.name}</button>
        ))}
      </div>
      <div className="flex gap-6 text-sm">
        <div><p className="text-xs text-muted">Best e1RM</p><p className="text-xl font-semibold tabular-nums">{ex.best} kg</p></div>
        <div><p className="text-xs text-muted">Since first log</p><p className={`text-xl font-semibold tabular-nums ${ex.change > 0 ? "text-good" : ex.change < 0 ? "text-bad" : ""}`}>{ex.change > 0 ? "+" : ""}{ex.change}%</p></div>
        <div><p className="text-xs text-muted">Sessions</p><p className="text-xl font-semibold tabular-nums">{ex.points.length}</p></div>
      </div>
      <div className="h-52 text-muted">
        <ResponsiveContainer>
          <LineChart data={ex.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={short} tick={axis} stroke="var(--border)" />
            <YAxis tick={axis} stroke="var(--border)" domain={["dataMin - 5", "dataMax + 5"]} unit="" />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => short(String(d))} formatter={(v, n) => [`${v} kg`, n === "e1rm" ? "Est. 1RM" : "Top set"]} />
            <Line type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="topKg" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted">Solid line: estimated 1-rep max (Epley) of your best set. Dashed: heaviest weight lifted.</p>
    </div>
  );
}

export function VolumeChart({ distance, time }: { distance: WeekVolume[]; time: WeekVolume[] }) {
  const [mode, setMode] = useState<"distance" | "time">("distance");
  const data = mode === "distance" ? distance : time;
  const sports = (mode === "distance" ? (["run", "bike", "swim"] as const) : (["gym", "run", "bike", "swim", "other"] as const)).filter((s) =>
    data.some((d) => d[s]),
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs">
          {(["distance", "time"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1 font-medium ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
              {m === "distance" ? "Distance (km)" : "Time (h)"}
            </button>
          ))}
        </div>
        <div className="flex gap-3 text-xs text-muted">
          {sports.map((s) => (
            <span key={s} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: COLORS[s] }} />{LABELS[s]}</span>
          ))}
        </div>
      </div>
      {sports.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Complete some sessions to see weekly volume.</p>
      ) : (
        <div className="h-52 text-muted">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tickFormatter={short} tick={axis} stroke="var(--border)" interval="preserveStartEnd" />
              <YAxis tick={axis} stroke="var(--border)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} labelFormatter={(d) => `Week of ${short(String(d))}`} />
              {sports.map((s, i) => (
                <Bar key={s} dataKey={s} name={LABELS[s]} stackId="a" fill={COLORS[s]} radius={i === sports.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
