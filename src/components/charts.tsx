"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StrengthPoint, WeekVolume } from "@/lib/progress";
import { Chip, Segmented } from "@/components/tandem/interactive";
import { SportIcon } from "@/components/tandem/icon";

// Series colours come straight from the design tokens, so they switch with dark mode.
const SPORTS = ["swim", "bike", "run", "gym", "other"] as const;
const LABEL = { swim: "Swim", bike: "Bike", run: "Run", gym: "Gym", other: "Other" } as const;

const short = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const tick = { fontSize: 11, fill: "var(--ink-muted)", fontFamily: "var(--font-data)" };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--ink)", fontFamily: "var(--font-data)" };

export function VolumeChart({ distance, time }: { distance: WeekVolume[]; time: WeekVolume[] }) {
  const [mode, setMode] = useState<"distance" | "time">("distance");
  const data = mode === "distance" ? distance : time;
  const sports = (mode === "distance" ? (["swim", "bike", "run"] as const) : SPORTS).filter((s) => data.some((d) => d[s]));
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Volume unit"
        value={mode}
        onChange={setMode}
        options={[
          { value: "distance", label: "Distance" },
          { value: "time", label: "Time" },
        ]}
      />
      {sports.length === 0 ? (
        <p className="m-0 py-8 text-center text-ink-muted">Complete a few sessions to see your weekly volume.</p>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="week" tickFormatter={short} tick={tick} stroke="var(--line)" interval="preserveStartEnd" minTickGap={28} tickLine={false} />
                <YAxis tick={tick} stroke="var(--line)" tickLine={false} axisLine={false} unit={mode === "distance" ? "" : "h"} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-sunken)" }} labelFormatter={(d) => `Week of ${short(String(d))}`} formatter={(v, n) => [`${v} ${mode === "distance" ? "km" : "h"}`, n]} />
                {sports.map((s, i) => (
                  <Bar key={s} dataKey={s} name={LABEL[s]} stackId="a" fill={`var(--${s})`} radius={i === sports.length - 1 ? [6, 6, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3">
            {sports.map((s) => (
              <span key={s} className="flex items-center gap-1.5 td-label td-muted">
                <SportIcon sport={s} tile={false} size={18} />
                {LABEL[s]}
              </span>
            ))}
            <span className="td-metric-s td-muted ml-auto">{mode === "distance" ? "km per week" : "hours per week"}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function StrengthChart({ exercises }: { exercises: { key: string; name: string; points: StrengthPoint[]; best: number; change: number }[] }) {
  const [sel, setSel] = useState(exercises[0]?.key);
  const ex = exercises.find((e) => e.key === sel) ?? exercises[0];
  if (!ex) return <p className="m-0 text-ink-muted">Log a gym session with reps and weights to see your strength curve.</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {exercises.map((e) => (
          <Chip key={e.key} selected={e.key === ex.key} onClick={() => setSel(e.key)}>
            {e.name}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <span className="td-label td-muted">Best 1RM</span>
          <span className="t-stat-m">{ex.best}<span className="td-metric-s td-muted"> kg</span></span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="td-label td-muted">Since first</span>
          <span className="t-stat-m" style={{ color: ex.change > 0 ? "var(--done)" : "var(--ink)" }}>{ex.change > 0 ? "+" : ""}{ex.change}%</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="td-label td-muted">Sessions</span>
          <span className="t-stat-m">{ex.points.length}</span>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer>
          <LineChart data={ex.points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={short} tick={tick} stroke="var(--line)" minTickGap={28} tickLine={false} />
            <YAxis tick={tick} stroke="var(--line)" tickLine={false} axisLine={false} allowDecimals={false} domain={[(min: number) => Math.floor((min - 5) / 5) * 5, (max: number) => Math.ceil((max + 5) / 5) * 5]} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => short(String(d))} formatter={(v, n) => [`${v} kg`, n === "e1rm" ? "Est. 1RM" : "Top set"]} />
            <Line type="monotone" dataKey="e1rm" stroke="var(--gym)" strokeWidth={2.5} dot={{ r: 3.5, fill: "var(--gym)" }} />
            <Line type="monotone" dataKey="topKg" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="td-metric-s td-muted m-0">Solid: estimated 1-rep max of your best set. Dashed: heaviest weight lifted.</p>
    </div>
  );
}
