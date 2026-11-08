"use client";

import { useTransition } from "react";
import { moveWorkout, setStatus, deleteWorkout } from "@/app/actions/workouts";
import type { Status } from "@/db/schema";

export function StatusControls({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  const opts: { s: Status; label: string; cls: string }[] = [
    { s: "planned", label: "Planned", cls: "bg-surface text-text" },
    { s: "done", label: "Done", cls: "bg-good text-white" },
    { s: "skipped", label: "Skipped", cls: "bg-bad text-white" },
  ];
  return (
    <div className={`flex rounded-xl bg-surface-2 p-1 text-sm ${pending ? "opacity-60" : ""}`}>
      {opts.map((o) => (
        <button
          key={o.s}
          disabled={pending}
          onClick={() => start(() => setStatus(id, o.s))}
          className={`flex-1 rounded-lg py-1.5 font-medium ${status === o.s ? `${o.cls} shadow-sm` : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MoveControl({ id, date, plannedDate, weekDays }: { id: string; date: string; plannedDate: string; weekDays: { date: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const go = (d: string) => d && d !== date && start(() => moveWorkout(id, d));
  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <button
            key={d.date}
            disabled={pending}
            onClick={() => go(d.date)}
            className={`rounded-lg py-2 text-xs font-medium ${
              d.date === date ? "bg-accent text-white" : d.date === plannedDate ? "bg-surface-2 ring-1 ring-accent/50" : "bg-surface-2 text-muted"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="date" defaultValue={date} className="input py-1.5 text-sm" onChange={(e) => go(e.target.value)} aria-label="Move to date" />
        {date !== plannedDate && (
          <button className="btn-ghost shrink-0 py-1.5" disabled={pending} onClick={() => go(plannedDate)}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm text-bad"
      disabled={pending}
      onClick={() => confirm("Delete this session?") && start(() => deleteWorkout(id))}
    >
      Delete session
    </button>
  );
}
