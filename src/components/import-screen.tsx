"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importCycle, type ImportState } from "@/app/actions/cycles";
import { EXAMPLE_CYCLE } from "@/lib/cycle-format";
import { planSummary, focusLabel } from "@/lib/sport";
import { addDays, formatDay, weekRange } from "@/lib/dates";
import { Symbol } from "@/components/hig/symbol";
import { Button, IconButton, ListSection, Screen, SegmentedControl, SportIcon } from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";

export function ImportScreen({ people, meId }: { people: { id: string; name: string }[]; meId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [src, setSrc] = useState<"paste" | "file">("paste");
  const [text, setText] = useState("");
  const [fname, setFname] = useState("");
  const partner = people.find((p) => p.id !== meId);
  const [who, setWho] = useState("me");
  const [res, setRes] = useState<ImportState>({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (intent: "preview" | "import") => {
    const f = new FormData();
    f.set("source", text);
    f.set("target", who);
    f.set("intent", intent);
    start(async () => {
      const r = await importCycle({ status: "idle" }, f);
      if (r.status === "imported") {
        toast({ message: `${r.name.replace(/^\d+\s*·\s*/, "")} imported · week 1`, icon: "checkmark", tone: "done" });
        router.push(`/week?w=${r.startDate}`);
      } else setRes(r);
    });
  };
  const ok = res.status === "preview" && res.source === text.replace(/\r\n?/g, "\n");
  const errs = res.status === "error" ? res.errors : [];

  return (
    <Screen title="Import cycle" large={false} leading={<IconButton icon="chevron.left" label="Back" href="/cycles" />} bodyClass="pad-none" floating={<ToastSlot />}>
      <div className="s-head">
        <h1>Load the next block</h1>
        <div className="meta">Paste the plan or pick its file. You’ll see every week before anything changes.</div>
      </div>
      <SegmentedControl<"paste" | "file">
        label="Source"
        full
        value={src}
        onChange={(v) => setSrc(v)}
        options={[
          { value: "paste", label: "Paste text" },
          { value: "file", label: "Upload file" },
        ]}
      />
      {src === "paste" ? (
        <ListSection footer="The cycle YAML: name, start, then weeks with their sessions.">
          <textarea
            className="textarea mono"
            aria-label="Cycle text"
            spellCheck={false}
            placeholder={"name: Block 1 – Base\nstart: 2026-11-30\nweeks:\n  - week: 1\n    sessions:\n      - { day: mon, sport: swim, distance: 2000m }"}
            value={text}
            onChange={(e) => (setText(e.target.value), setRes({ status: "idle" }))}
          />
        </ListSection>
      ) : (
        <ListSection footer={fname ? `${text.split("\n").length} lines loaded.` : "A .yaml file from the season folder (block-01-intro.yaml…)."}>
          <label className="file-cell">
            <span>{fname || "No file chosen"}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".yaml,.yml,.txt,text/yaml"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFname(f.name);
                setText(await f.text());
                setRes({ status: "idle" });
              }}
            />
            <Button variant="bordered" size="s" icon="square.and.arrow.down" onClick={(e) => (e.preventDefault(), fileRef.current?.click())}>
              Choose file
            </Button>
          </label>
        </ListSection>
      )}
      <div className="ex-tools">
        <Button variant="plain" size="s" icon="square.on.square" onClick={() => (setSrc("paste"), setText(EXAMPLE_CYCLE), setRes({ status: "idle" }))}>
          Load example
        </Button>
      </div>
      {partner && (
        <ListSection>
          <div className="status-row">
            <span>For</span>
            <SegmentedControl
              size="s"
              label="Who the cycle is for"
              value={who}
              onChange={setWho}
              options={[
                { value: "me", label: "Me" },
                { value: partner.id, label: partner.name },
                { value: "both", label: "Both" },
              ]}
            />
          </div>
        </ListSection>
      )}
      {!ok && (
        <Button variant="prominent" size="xl" full disabled={!text.trim() || pending} onClick={() => run("preview")}>
          {pending ? "Checking…" : errs.length ? "Check again" : "Check"}
        </Button>
      )}
      {errs.length > 0 && (
        <ListSection header={`Fix ${errs.length} ${errs.length > 1 ? "lines" : "line"}`} footer="Nothing was imported. Edit the text and check again.">
          {errs.map((e, i) => (
            <div key={i} className="err-row">
              <Symbol name="exclamationmark.circle" size={18} weight="semibold" />
              <div>{e}</div>
            </div>
          ))}
        </ListSection>
      )}
      {ok && res.status === "preview" && (
        <>
          <div className="story">
            <span className="ic">
              <Symbol name="checkmark" size={20} weight="bold" />
            </span>
            <div>
              <b>{res.cycle.name.replace(/^\d+\s*·\s*/, "")} looks good</b>
              <span>
                {res.cycle.weeks} weeks · {res.cycle.workouts.length} sessions · from {formatDay(res.cycle.startDate, { weekday: "long", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
          {Array.from({ length: res.cycle.weeks }, (_, i) => i + 1).map((wk) => {
            const list = res.cycle.workouts.filter((x) => x.week === wk);
            return (
              <ListSection key={wk} header={`Week ${wk}${res.cycle.weekFocus[wk] ? ` · ${focusLabel(res.cycle.weekFocus[wk])}` : ""}`} headerTrailing={`${weekRange(addDays(res.cycle.startDate, (wk - 1) * 7))} · ${list.length} sessions`}>
                {list.map((s, si) => (
                  <div key={si} className="prev-row">
                    <SportIcon sport={s.sport} size="s" />
                    <div className="t">
                      <b>{s.title}</b>
                      <span>{planSummary(s) || "Free session"}</span>
                    </div>
                    <span className="d">{formatDay(s.date, { weekday: "short" })}</span>
                  </div>
                ))}
              </ListSection>
            );
          })}
          <Button variant="prominent" size="xl" full icon="square.and.arrow.down" disabled={pending} onClick={() => run("import")}>
            {pending ? "Importing…" : `Import ${res.cycle.workouts.length * (who === "both" ? 2 : 1)} sessions`}
          </Button>
        </>
      )}
    </Screen>
  );
}
