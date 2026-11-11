"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { GymLog, GymPlan, LoggedSet } from "@/lib/plan-types";
import { estimate1RM, formatPace, parseDistance, parseDuration } from "@/lib/units";
import { DoneTick, MoodPicker, RpeScale, Stepper, TextField } from "@/components/tandem/interactive";
import { Button } from "@/components/tandem/ui";

function SaveBar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="td-savebar">
      <button className="td-btn td-btn-primary td-btn-block" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

function Wellbeing({ rpe, feeling, notes }: { rpe?: number | null; feeling?: number | null; notes?: string | null }) {
  const [r, setR] = useState(rpe ?? 0);
  const [f, setF] = useState(feeling ?? 0);
  return (
    <div className="flex flex-col gap-6">
      <input type="hidden" name="rpe" value={r || ""} />
      <input type="hidden" name="feeling" value={f || ""} />
      <RpeScale value={r} onChange={setR} />
      <MoodPicker value={f} onChange={setF} />
      <TextField label="Notes" name="notes" multiline rows={2} defaultValue={notes ?? ""} placeholder="Sleep, niggles, conditions" />
    </div>
  );
}

type Prev = Record<string, { date: string; sets: LoggedSet[] }>;
type Ex = GymLog["exercises"][number];

export function GymLogForm({
  action,
  plan,
  log,
  prev,
  rpe,
  feeling,
  notes,
}: {
  action: (f: FormData) => Promise<void>;
  plan: GymPlan;
  log: GymLog | null;
  prev: Prev;
  rpe?: number | null;
  feeling?: number | null;
  notes?: string | null;
}) {
  const initial: Ex[] =
    log?.exercises ??
    plan.exercises.map((e) => ({
      name: e.name,
      sets: Array.from({ length: e.sets }, () => ({ reps: parseInt(e.reps) || null, weightKg: e.loadKg ?? null })),
    }));
  const [ex, setEx] = useState(initial);
  const planFor = (name: string) => plan.exercises.find((p) => p.name.toLowerCase() === name.toLowerCase());
  const patchSet = (i: number, j: number, patch: Partial<LoggedSet>) =>
    setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.map((s, b) => (b !== j ? s : { ...s, ...patch })) })));
  const addSet = (i: number) =>
    setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: [...e.sets, { reps: e.sets.at(-1)?.reps ?? null, weightKg: e.sets.at(-1)?.weightKg ?? null }] })));
  const sameAsLast = (i: number) =>
    setEx((cur) =>
      cur.map((e, a) => {
        if (a !== i) return e;
        const lastDone = [...e.sets].reverse().find((s) => s.done) ?? e.sets[0];
        const next = e.sets.findIndex((s) => !s.done);
        if (next < 0 || !lastDone) return { ...e, sets: [...e.sets, { reps: lastDone?.reps ?? null, weightKg: lastDone?.weightKg ?? null, done: true }] };
        return { ...e, sets: e.sets.map((s, b) => (b === next ? { reps: lastDone.reps, weightKg: lastDone.weightKg, done: true } : s)) };
      }),
    );
  const removeSet = (i: number) => setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.slice(0, -1) })));

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="gym" value={JSON.stringify(ex)} />
      {ex.map((e, i) => {
        const p = planFor(e.name);
        const last = prev[e.name.toLowerCase()];
        const best = Math.max(0, ...e.sets.map((s) => estimate1RM(s.weightKg ?? 0, s.reps ?? 0)));
        const lastTop = last ? Math.max(...last.sets.map((s) => s.weightKg ?? 0)) : 0;
        return (
          <section key={i} className="td-tile" style={{ gap: 12, padding: 16 }} aria-label={e.name}>
            <input
              value={e.name}
              onChange={(v) => setEx((cur) => cur.map((x, a) => (a === i ? { ...x, name: v.target.value } : x)))}
              className="t-title"
              style={{ border: 0, background: "transparent", color: "var(--ink)", outline: "none", padding: 0, fontFamily: "var(--font-text)" }}
              aria-label="Exercise name"
            />
            <div className="td-set-head">
              <span className="td-metric-s td-muted">
                {p ? `Plan ${p.sets} × ${p.reps}${p.load ? ` @ ${p.load}` : ""}` : "Extra exercise"}
                {best ? ` · est. 1RM ${best} kg` : ""}
              </span>
              {lastTop > 0 && <span className="td-metric-s td-muted">last {lastTop}</span>}
            </div>
            <div className="flex flex-col gap-2">
              {e.sets.map((s, j) => (
                <div key={j} className="td-set">
                  <span className="td-set-n" aria-label={`Set ${j + 1}`}>{j + 1}</span>
                  <div className="td-set-reps">
                    <Stepper value={s.reps} step={1} unit="reps" onChange={(n) => patchSet(i, j, { reps: n })} />
                  </div>
                  <div className="td-set-kg">
                    <Stepper value={s.weightKg} step={2.5} unit="kg" onChange={(n) => patchSet(i, j, { weightKg: n })} />
                  </div>
                  <DoneTick checked={!!s.done} label={`set ${j + 1}`} onChange={(d) => patchSet(i, j, { done: d })} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon="repeat" onClick={() => sameAsLast(i)}>Same as last set</Button>
              <Button variant="ghost" size="sm" icon="plus" onClick={() => addSet(i)}>Add set</Button>
              {e.sets.length > 0 && <Button variant="ghost" size="sm" icon="minus" onClick={() => removeSet(i)}>Remove</Button>}
            </div>
          </section>
        );
      })}
      <Button variant="secondary" icon="plus" block onClick={() => setEx((c) => [...c, { name: "New exercise", sets: [{ reps: null, weightKg: null }] }])}>
        Add exercise
      </Button>
      <Wellbeing rpe={rpe} feeling={feeling} notes={notes} />
      <SaveBar label={log ? "Update log" : "Save log"} />
    </form>
  );
}

export function EnduranceLogForm({
  action,
  sport,
  initial,
  rpe,
  feeling,
  notes,
  hasLog,
}: {
  action: (f: FormData) => Promise<void>;
  sport: string;
  initial: { distance?: string; duration?: string; avgHr?: number; avgPower?: number; elevation?: number };
  rpe?: number | null;
  feeling?: number | null;
  notes?: string | null;
  hasLog: boolean;
}) {
  const [dist, setDist] = useState(initial.distance ?? "");
  const [dur, setDur] = useState(initial.duration ?? "");
  const unit = sport === "swim" ? "m" : "km";
  let pace = "";
  try {
    const m = dist ? parseDistance(/[a-z]/i.test(dist) ? dist : `${dist}${unit}`) : undefined;
    const s = dur ? parseDuration(dur) : undefined;
    pace = formatPace(sport, m, s);
  } catch {}
  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Distance" name="distance" numeric unit={unit} value={dist} onChange={setDist} placeholder={sport === "swim" ? "2000" : "8.2"} />
        <TextField label="Time" name="duration" value={dur} onChange={setDur} placeholder="45:30" hint={pace ? `Pace ${pace}` : "45:30 or 1h05"} mono />
        <TextField label="Avg HR" name="avgHr" numeric unit="bpm" defaultValue={initial.avgHr?.toString()} />
        {sport === "bike" ? (
          <TextField label="Avg power" name="avgPower" numeric unit="W" defaultValue={initial.avgPower?.toString()} />
        ) : sport !== "swim" ? (
          <TextField label="Elevation" name="elevation" numeric unit="m" defaultValue={initial.elevation?.toString()} />
        ) : null}
      </div>
      <Wellbeing rpe={rpe} feeling={feeling} notes={notes} />
      <SaveBar label={hasLog ? "Update log" : "Save log"} />
    </form>
  );
}
