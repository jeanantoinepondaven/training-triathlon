"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { GymLog, GymPlan, LoggedSet } from "@/lib/plan-types";
import { estimate1RM } from "@/lib/units";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

function Wellbeing({ rpe, feeling, notes }: { rpe?: number | null; feeling?: number | null; notes?: string | null }) {
  const [r, setR] = useState(rpe ?? 0);
  const [f, setF] = useState(feeling ?? 0);
  return (
    <div className="space-y-3">
      <div>
        <span className="label">Effort (RPE)</span>
        <input type="hidden" name="rpe" value={r || ""} />
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button type="button" key={n} onClick={() => setR(n === r ? 0 : n)}
              className={`rounded-lg py-1.5 text-sm ${n === r ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">How did you feel?</span>
        <input type="hidden" name="feeling" value={f || ""} />
        <div className="grid grid-cols-5 gap-1">
          {["😫", "😕", "😐", "🙂", "🤩"].map((e, i) => (
            <button type="button" key={i} onClick={() => setF(i + 1 === f ? 0 : i + 1)}
              className={`rounded-lg py-1.5 text-xl ${i + 1 === f ? "bg-accent/20 ring-2 ring-accent" : "bg-surface-2"}`}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={notes ?? ""} className="input" placeholder="Sleep, niggles, conditions…" />
      </div>
    </div>
  );
}

type Prev = Record<string, { date: string; sets: LoggedSet[] }>;

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
  const initial: GymLog["exercises"] =
    log?.exercises ??
    plan.exercises.map((e) => ({
      name: e.name,
      sets: Array.from({ length: e.sets }, () => ({ reps: parseInt(e.reps) || null, weightKg: e.loadKg ?? null })),
    }));
  const [ex, setEx] = useState(initial);

  const update = (i: number, j: number, k: keyof LoggedSet, v: string) =>
    setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.map((s, b) => (b !== j ? s : { ...s, [k]: v === "" ? null : Number(v) })) })));
  const addSet = (i: number) =>
    setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { reps: null, weightKg: null }) }] })));
  const removeSet = (i: number) => setEx((cur) => cur.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.slice(0, -1) })));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="gym" value={JSON.stringify(ex)} />
      {ex.map((e, i) => {
        const p = prev[e.name.toLowerCase()];
        const best = Math.max(0, ...e.sets.map((s) => estimate1RM(s.weightKg ?? 0, s.reps ?? 0)));
        return (
          <div key={i} className="card p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <input
                value={e.name}
                onChange={(v) => setEx((cur) => cur.map((x, a) => (a === i ? { ...x, name: v.target.value } : x)))}
                className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                aria-label="Exercise name"
              />
              {best > 0 && <span className="shrink-0 text-xs text-muted">e1RM {best} kg</span>}
            </div>
            {p && (
              <p className="mb-2 text-xs text-muted">
                Last time: {p.sets.map((s) => `${s.reps ?? "?"}×${s.weightKg ?? "–"}`).join(", ")}
              </p>
            )}
            <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 text-sm">
              <span className="text-xs text-muted">Set</span>
              <span className="text-xs text-muted">Reps</span>
              <span className="text-xs text-muted">kg</span>
              {e.sets.map((s, j) => (
                <div key={j} className="contents">
                  <span className="text-muted">{j + 1}</span>
                  <input inputMode="numeric" className="input py-1.5" value={s.reps ?? ""} onChange={(v) => update(i, j, "reps", v.target.value)} aria-label={`Set ${j + 1} reps`} />
                  <input inputMode="decimal" className="input py-1.5" value={s.weightKg ?? ""} onChange={(v) => update(i, j, "weightKg", v.target.value.replace(",", "."))} aria-label={`Set ${j + 1} weight`} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-ghost flex-1 py-1.5" onClick={() => addSet(i)}>+ Set</button>
              {e.sets.length > 0 && <button type="button" className="btn-ghost py-1.5" onClick={() => removeSet(i)}>− Set</button>}
            </div>
          </div>
        );
      })}
      <button type="button" className="btn-ghost w-full" onClick={() => setEx((c) => [...c, { name: "New exercise", sets: [{ reps: null, weightKg: null }] }])}>
        + Add exercise
      </button>
      <Wellbeing rpe={rpe} feeling={feeling} notes={notes} />
      <SaveButton label={log ? "Update log" : "Save & mark done"} />
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
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="distance">Distance ({sport === "swim" ? "m" : "km"})</label>
          <input id="distance" name="distance" inputMode="decimal" defaultValue={initial.distance} className="input" placeholder={sport === "swim" ? "2000" : "8.2"} />
        </div>
        <div>
          <label className="label" htmlFor="duration">Time</label>
          <input id="duration" name="duration" defaultValue={initial.duration} className="input" placeholder="45:30 or 1h05" />
        </div>
        <div>
          <label className="label" htmlFor="avgHr">Avg HR</label>
          <input id="avgHr" name="avgHr" inputMode="numeric" defaultValue={initial.avgHr} className="input" placeholder="bpm" />
        </div>
        {sport === "bike" ? (
          <div>
            <label className="label" htmlFor="avgPower">Avg power</label>
            <input id="avgPower" name="avgPower" inputMode="numeric" defaultValue={initial.avgPower} className="input" placeholder="W" />
          </div>
        ) : sport !== "swim" ? (
          <div>
            <label className="label" htmlFor="elevation">Elevation</label>
            <input id="elevation" name="elevation" inputMode="numeric" defaultValue={initial.elevation} className="input" placeholder="m" />
          </div>
        ) : null}
      </div>
      <Wellbeing rpe={rpe} feeling={feeling} notes={notes} />
      <SaveButton label={hasLog ? "Update log" : "Save & mark done"} />
    </form>
  );
}
