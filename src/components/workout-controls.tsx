"use client";

import { useTransition } from "react";
import { deleteWorkout, moveWorkout, setStatus } from "@/app/actions/workouts";
import type { Status } from "@/db/schema";
import { Chip, Segmented, TextField } from "@/components/tandem/interactive";
import { Button } from "@/components/tandem/ui";

export function StatusControl({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  return (
    <div style={{ opacity: pending ? 0.6 : 1 }}>
      <Segmented<Status>
        label="Session status"
        block
        value={status}
        onChange={(s) => s !== status && start(() => setStatus(id, s))}
        options={[
          { value: "planned", label: "Planned" },
          { value: "done", label: "Done", icon: "check" },
          { value: "skipped", label: "Skipped" },
        ]}
      />
    </div>
  );
}

export function MoveControl({ id, date, plannedDate, weekDays }: { id: string; date: string; plannedDate: string; weekDays: { date: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const go = (d: string) => d && d !== date && start(() => moveWorkout(id, d));
  return (
    <div className="flex flex-col gap-3" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="flex flex-wrap gap-2">
        {weekDays.map((d) => (
          <Chip key={d.date} selected={false} disabled={d.date === date || pending} onClick={() => go(d.date)}>
            {d.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField label="Or pick a date" type="date" defaultValue={date} onChange={(v) => go(v)} />
        </div>
        {date !== plannedDate && (
          <Button variant="secondary" icon="repeat" disabled={pending} onClick={() => go(plannedDate)}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm("Delete this session?") && start(() => deleteWorkout(id))} style={{ color: "var(--alert)" }}>
      Delete session
    </Button>
  );
}
