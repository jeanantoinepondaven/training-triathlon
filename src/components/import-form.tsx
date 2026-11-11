"use client";

import { useActionState, useRef, useState } from "react";
import { importCycle, type ImportState } from "@/app/actions/cycles";
import { EXAMPLE_CYCLE } from "@/lib/cycle-format";
import { planSummary } from "@/lib/sport";
import { formatDay } from "@/lib/dates";
import { SportIcon } from "@/components/tandem/icon";
import { Segmented, TextField } from "@/components/tandem/interactive";
import { Button, ButtonLink, Notice, SectionLabel } from "@/components/tandem/ui";

export function ImportForm({ people, meId }: { people: { id: string; name: string }[]; meId: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCycle, { status: "idle" });
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("me");
  const fileRef = useRef<HTMLInputElement>(null);
  const intent = useRef<HTMLInputElement>(null);
  const previewReady = state.status === "preview" && state.source === source;

  if (state.status === "imported") {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="done" title={`${state.name} imported.`}>
          {state.count} sessions from {formatDay(state.startDate, { weekday: "long", day: "numeric", month: "long" })}.
        </Notice>
        <ButtonLink href={`/?w=${state.startDate}`} variant="primary" block>
          See week 1
        </ButtonLink>
      </div>
    );
  }

  const partners = people.filter((p) => p.id !== meId);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="intent" ref={intent} defaultValue="preview" />
      <input type="hidden" name="target" value={target} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon="up" onClick={() => fileRef.current?.click()}>
          Upload file
        </Button>
        <Button variant="ghost" onClick={() => setSource(EXAMPLE_CYCLE)}>
          Load example
        </Button>
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

      <TextField label="Cycle file" name="source" multiline rows={12} mono value={source} onChange={setSource} placeholder="Paste your cycle here" required />

      {partners.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="td-label td-muted">For</span>
          <Segmented
            label="Who this cycle is for"
            block
            value={target}
            onChange={setTarget}
            options={[{ value: "me", label: "Me" }, ...partners.map((p) => ({ value: p.id, label: p.name })), { value: "both", label: "Both" }]}
          />
        </div>
      )}

      {state.status === "error" && (
        <Notice tone="error" title="Fix these and check again">
          <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
            {state.errors.map((e, i) => (
              <li key={i} className="td-metric-s">{e}</li>
            ))}
          </ul>
        </Notice>
      )}

      {previewReady && state.status === "preview" && (
        <section className="td-tile" style={{ padding: 16, gap: 16 }} aria-label="Preview">
          <div>
            <span className="td-label td-muted">{state.cycle.goal ?? "Preview"}</span>
            <h2 className="t-display-m m-0">{state.cycle.name}</h2>
            <p className="td-metric-s td-muted m-0">
              {state.cycle.weeks} wk · {state.cycle.workouts.length} sessions · from {formatDay(state.cycle.startDate, { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>
          {Array.from({ length: state.cycle.weeks }, (_, i) => i + 1).map((wk) => (
            <div key={wk} className="flex flex-col gap-2">
              <SectionLabel>
                Week {wk}
                {state.cycle.weekFocus[wk] ? ` · ${state.cycle.weekFocus[wk]}` : ""}
              </SectionLabel>
              {state.cycle.workouts
                .filter((w) => w.week === wk)
                .map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SportIcon sport={w.sport} />
                    <div className="min-w-0">
                      <div className="t-title truncate">{w.title}</div>
                      <div className="td-metric-s td-muted truncate">
                        {formatDay(w.date, { weekday: "short", day: "numeric" })} · {planSummary(w) || "free session"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </section>
      )}

      <div className="td-savebar flex gap-2">
        <button className="td-btn td-btn-secondary flex-1" disabled={pending || !source} onClick={() => intent.current && (intent.current.value = "preview")}>
          {pending ? "Checking…" : "Check"}
        </button>
        <button className="td-btn td-btn-lane flex-1" disabled={pending || !previewReady} onClick={() => intent.current && (intent.current.value = "import")}>
          Import
        </button>
      </div>
    </form>
  );
}
