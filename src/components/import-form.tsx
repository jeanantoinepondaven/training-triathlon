"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { importCycle, type ImportState } from "@/app/actions/cycles";
import { EXAMPLE_CYCLE } from "@/lib/cycle-format";
import { SPORT_LABEL, SPORT_STYLE, planSummary } from "@/lib/sport";
import { formatDay } from "@/lib/dates";

export function ImportForm({ people, meId }: { people: { id: string; name: string }[]; meId: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCycle, { status: "idle" });
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("me");
  const fileRef = useRef<HTMLInputElement>(null);
  const intent = useRef<HTMLInputElement>(null);

  if (state.status === "imported") {
    return (
      <div className="card space-y-3 p-5 text-center">
        <p className="text-lg font-semibold">✓ {state.name} imported</p>
        <p className="text-sm text-muted">{state.count} sessions added, starting {formatDay(state.startDate, { weekday: "long", day: "numeric", month: "long" })}.</p>
        <Link href={`/?w=${state.startDate}`} className="btn-primary">See week 1</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="intent" ref={intent} defaultValue="preview" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost py-1.5" onClick={() => fileRef.current?.click()}>Upload .yaml file</button>
        <button type="button" className="btn-ghost py-1.5" onClick={() => setSource(EXAMPLE_CYCLE)}>Load example</button>
        <input
          ref={fileRef}
          type="file"
          accept=".yaml,.yml,.txt,text/yaml"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setSource(await f.text());
          }}
        />
      </div>
      <textarea
        name="source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={16}
        spellCheck={false}
        className="input font-mono text-xs leading-relaxed"
        placeholder="Paste your cycle YAML here…"
        required
      />
      {people.length > 1 && (
        <div>
          <span className="label">For</span>
          <input type="hidden" name="target" value={target} />
          <div className="flex rounded-xl bg-surface-2 p-1 text-sm">
            {[{ id: "me", name: "Me" }, ...people.filter((p) => p.id !== meId), { id: "both", name: "Both of us" }].map((p) => (
              <button type="button" key={p.id} onClick={() => setTarget(p.id)}
                className={`flex-1 rounded-lg py-1.5 font-medium ${target === p.id ? "bg-surface shadow-sm" : "text-muted"}`}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
      {people.length <= 1 && <input type="hidden" name="target" value="me" />}

      {state.status === "error" && (
        <div className="rounded-xl bg-bad/10 p-3 text-sm text-bad">
          <p className="mb-1 font-medium">Fix these and try again:</p>
          <ul className="list-disc space-y-0.5 pl-5">{state.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {state.status === "preview" && state.source === source && (
        <div className="card space-y-3 p-4">
          <div>
            <p className="font-semibold">{state.cycle.name}</p>
            <p className="text-sm text-muted">
              {state.cycle.weeks} weeks · {state.cycle.workouts.length} sessions · from {formatDay(state.cycle.startDate, { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>
          {Array.from({ length: state.cycle.weeks }, (_, i) => i + 1).map((wk) => (
            <div key={wk}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Week {wk}{state.cycle.weekFocus[wk] ? ` · ${state.cycle.weekFocus[wk]}` : ""}</p>
              <ul className="space-y-1">
                {state.cycle.workouts.filter((w) => w.week === wk).map((w, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={`size-2 shrink-0 rounded-full ${SPORT_STYLE[w.sport].dot}`} />
                    <span className="w-16 shrink-0 text-muted">{formatDay(w.date, { weekday: "short", day: "numeric" })}</span>
                    <span className="truncate"><b className="font-medium">{w.title}</b> <span className="text-muted">{SPORT_LABEL[w.sport]} · {planSummary(w)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" disabled={pending || !source} onClick={() => intent.current && (intent.current.value = "preview")}>
          {pending ? "…" : "Check"}
        </button>
        <button
          className="btn-primary flex-1"
          disabled={pending || !(state.status === "preview" && state.source === source)}
          onClick={() => intent.current && (intent.current.value = "import")}
        >
          Import
        </button>
      </div>
    </form>
  );
}
