"use client";

import { useState } from "react";
import type { Sport } from "@/db/schema";
import { Symbol } from "@/components/hig/symbol";
import { ListRow, ListSection, Pill, Screen, SegmentedControl, SportIcon, StatTile, TabBar, cx } from "@/components/hig/ui";
import { ToastSlot } from "@/components/hig/toast";
import { hm } from "@/lib/sport";

export type ProgressData = {
  people: { id: string; name: string }[];
  viewedId: string;
  meId: string;
  cycleName: string;
  cons: { week: string; pct: number }[];
  block: { done: number; due: number };
  vol: { label: string; t: Record<"swim" | "bike" | "run", number>; d: Record<"swim" | "bike" | "run", number> }[];
  lifts: { name: string; points: number[] }[];
  records: { sport: Sport; title: string; sub: string; detail: string }[];
  sessionsDone: number;
};

export function ProgressScreen({ data }: { data: ProgressData }) {
  const [metric, setMetric] = useState<"t" | "d">("t");
  const [lift, setLift] = useState(data.lifts[0]?.name);
  const cons = data.cons.map((c) => c.pct);
  let streak = 0;
  for (let i = cons.length - 2; i >= 0 && cons[i] >= 0.8; i--) streak++;
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const last4 = avg(cons.slice(-4));
  const prev4 = avg(cons.slice(-8, -4));
  const started = cons.findIndex((c) => c > 0);
  const all = avg(started >= 0 ? cons.slice(started) : []);
  const tot = data.vol.map((r) => (["swim", "bike", "run"] as const).reduce((x, s) => x + r[metric][s], 0));
  const max = Math.max(...tot, 1);
  const series = data.lifts.find((l) => l.name === lift)?.points ?? [];
  const gain = series.length > 1 ? Math.round((series[series.length - 1] - series[0]) * 10) / 10 : 0;
  const thisVol = data.vol[data.vol.length - 1];
  const prevVol = data.vol[data.vol.length - 2];
  const bikeUp = thisVol && prevVol && thisVol.t.bike > prevVol.t.bike;
  const story =
    series.length > 1 ? `${lift} est. 1RM ${gain >= 0 ? "up" : "down"} ${Math.abs(gain)} kg.${bikeUp ? " Bike volume up this week." : ""}` : started < 0 ? "Tick or log your first sessions to start the story." : "Keep ticking sessions: the trend shows after a few weeks.";

  return (
    <Screen
      title="Progress"
      subtitle={data.cycleName || undefined}
      floating={
        <>
          <ToastSlot />
          <TabBar />
        </>
      }
    >
      {data.people.length > 1 && (
        <SegmentedControl
          label="Whose progress"
          full
          value={data.viewedId}
          options={data.people.map((p) => ({ value: p.id, label: p.id === data.meId ? "Me" : p.name, href: p.id === data.meId ? "/progress" : `/progress?u=${p.id}` }))}
        />
      )}
      <div className="story">
        <span className="ic">
          <Symbol name={streak >= 3 ? "flame" : "arrow.up.right"} size={20} weight="bold" />
        </span>
        <div>
          <b>{streak >= 2 ? `${streak} weeks in a row above 80%` : last4 >= 0.8 ? "On track this month" : "Back on track this week"}</b>
          <span>{story}</span>
        </div>
      </div>
      <div className="tiles">
        <StatTile label="This block" value={String(data.block.done)} unit={`/${data.block.due}`} />
        <StatTile label="Last 4 wk" value={String(Math.round(last4 * 100))} unit="%" delta={prev4 ? `${Math.abs(Math.round((last4 - prev4) * 100))} pts` : undefined} down={last4 < prev4} />
        <StatTile label="All time" value={String(Math.round(all * 100))} unit="%" />
      </div>
      <ListSection padded>
        <div>
          <div className="chart-head">
            <b>Consistency</b>
            <span>Sessions done, {cons.length} weeks</span>
          </div>
          <div className="cons" role="img" aria-label={`Weekly completion for the last ${cons.length} weeks. ${streak} weeks in a row above 80%.`} style={{ gridTemplateColumns: `repeat(${cons.length}, 1fr)` }}>
            {cons.map((v, i) => (
              <i key={i} className={i === cons.length - 1 ? "now" : v >= 1 ? "full" : ""} style={{ height: Math.max(4, Math.round(v * 64)) }} title={`${Math.round(v * 100)}%`} />
            ))}
          </div>
          <div className="axis">
            <span>{data.cons[0]?.week}</span>
            <span>This week</span>
          </div>
        </div>
      </ListSection>
      <ListSection padded>
        <div>
          <div className="chart-head">
            <b>Volume</b>
            <SegmentedControl<"t" | "d">
              size="s"
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "t", label: "Time" },
                { value: "d", label: "Km" },
              ]}
            />
          </div>
          <div className="vol">
            {data.vol.map((r, ri) => (
              <div key={r.label} className="vrow">
                <span>{r.label}</span>
                <div className="vbar">
                  {(["swim", "bike", "run"] as const).map((sp) => {
                    const v = r[metric][sp];
                    return v ? <i key={sp} className={sp} style={{ width: `${(v / max) * 100}%` }} title={`${sp} ${metric === "d" ? `${v.toFixed(1)} km` : hm(Math.round(v))}`} /> : null;
                  })}
                </div>
                <b>{metric === "d" ? `${tot[ri].toFixed(1)} km` : hm(Math.round(tot[ri]))}</b>
              </div>
            ))}
          </div>
          <div className="legend">
            <SportIcon sport="swim" tag />
            <SportIcon sport="bike" tag />
            <SportIcon sport="run" tag />
          </div>
        </div>
      </ListSection>
      <ListSection padded>
        <div>
          <div className="chart-head">
            <b>Strength</b>
            <span>Est. 1RM, best set per session</span>
          </div>
          {data.lifts.length ? (
            <>
              <div className="pills" style={{ marginBottom: 12 }}>
                {data.lifts.map((l) => (
                  <Pill key={l.name} selected={l.name === lift} onClick={() => setLift(l.name)}>
                    {l.name}
                  </Pill>
                ))}
              </div>
              {series.length > 1 ? <LineChart values={series} unit="kg" /> : <p className="hig-caption" style={{ margin: 0 }}>One session logged so far: {series[0]} kg. The curve appears after the next one.</p>}
            </>
          ) : (
            <p className="hig-caption" style={{ margin: 0 }}>
              Log a gym session with reps and kg to see your strength curve.
            </p>
          )}
        </div>
      </ListSection>
      <ListSection header="Records" headerTrailing={`${data.sessionsDone} sessions done`}>
        {data.records.length ? (
          data.records.map((r, i) => <ListRow key={i} leading={<SportIcon sport={r.sport} />} title={r.title} subtitle={r.sub} detail={r.detail} />)
        ) : (
          <div className="note-cell">Records appear once you log distances and times.</div>
        )}
      </ListSection>
    </Screen>
  );
}

function LineChart({ values: v, unit }: { values: number[]; unit: string }) {
  const W = 320,
    H = 130,
    padL = 30,
    padR = 52,
    padT = 12,
    padB = 22;
  const lo = Math.floor((Math.min(...v) - 2) / 5) * 5;
  const hi = Math.ceil((Math.max(...v) + 2) / 5) * 5;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (v.length - 1);
  const y = (val: number) => padT + ((hi - val) / (hi - lo)) * (H - padT - padB);
  const pts = v.map((val, i) => `${x(i)},${y(val)}`).join(" ");
  const area = `M${x(0)},${H - padB} L${pts.replace(/ /g, " L")} L${x(v.length - 1)},${H - padB} Z`;
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Estimated one-rep max over ${v.length} sessions, from ${v[0]} to ${v[v.length - 1]} ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={padL} x2={W - padR + 6} y1={y(t)} y2={y(t)} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end">
              {t % 1 ? t.toFixed(1) : t}
            </text>
          </g>
        ))}
        <path className="area" d={area} />
        <polyline className="line" points={pts} />
        {v.map((val, i) => (
          <circle key={i} className={cx("dot", i === v.length - 1 && "end")} cx={x(i)} cy={y(val)} r={i === v.length - 1 ? 4.5 : 3} />
        ))}
        <text className="endlbl" x={x(v.length - 1) + 9} y={y(v[v.length - 1]) + 4}>
          {v[v.length - 1]} {unit}
        </text>
        <text x={x(0)} y={H - 4} textAnchor="start">
          First
        </text>
        <text x={x(v.length - 1)} y={H - 4} textAnchor="end">
          Now
        </text>
      </svg>
    </div>
  );
}
