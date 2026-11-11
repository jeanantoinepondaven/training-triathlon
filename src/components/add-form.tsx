"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addWorkout } from "@/app/actions/workouts";
import { SPORTS, type Sport } from "@/db/schema";
import { SPORT_NAME } from "@/components/tandem/icon";
import { Chip, TextField } from "@/components/tandem/interactive";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="td-btn td-btn-primary td-btn-block" disabled={pending}>{pending ? "Adding…" : "Add session"}</button>;
}

export function AddForm({ date }: { date: string }) {
  const [sport, setSport] = useState<Sport>("run");
  return (
    <form action={addWorkout} className="flex flex-col gap-6">
      <input type="hidden" name="sport" value={sport} />
      <div className="flex flex-col gap-2">
        <span className="td-label td-muted">Sport</span>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <Chip key={s} icon={s} selected={sport === s} onClick={() => setSport(s)}>
              {SPORT_NAME[s]}
            </Chip>
          ))}
        </div>
      </div>
      <TextField label="Title" name="title" placeholder="Recovery jog" />
      <TextField label="Date" name="date" type="date" defaultValue={date} required />
      <TextField label="Description" name="description" multiline rows={2} placeholder="Optional" />
      <div className="td-savebar">
        <Submit />
      </div>
    </form>
  );
}
