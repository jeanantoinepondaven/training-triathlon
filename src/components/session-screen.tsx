"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteWorkout, logWorkout, moveWorkout, setStatus } from "@/app/actions/workouts";
import { setOnWatch } from "@/app/actions/intervals";
import { canSendToWatch } from "@/lib/intervals-format";
import type { Workout } from "@/db/schema";
import type { GymPlan, LoggedSet } from "@/lib/plan-types";
import { Symbol } from "@/components/hig/symbol";
import {
  Button,
  Field,
  IconButton,
  IntervalSteps,
  ListRow,
  ListSection,
  MenuLayer,
  type MenuItem,
  MoodPicker,
  RpeSlider,
  Screen,
  SegmentedControl,
  SetRow,
  SportIcon,
  StatTile,
  Stepper,
  Tag,
  Toggle,
} from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";
import { MoveSheet, type WW } from "@/components/week-screen";
import { estimateMinutes, heroStat, higSteps, hm } from "@/lib/sport";
import { estimate1RM, formatPace, parseDistance, parseDuration, formatDuration } from "@/lib/units";
import { formatDay } from "@/lib/dates";
import { SPORTS } from "@/components/hig/symbol";

type Set = { reps: number; kg: number; done: boolean };
type Ex = { name: string; sets: Set[] };
type Draft =
  | { kind: "gym"; exercises: Ex[]; rpe: number; mood: number; note: string }
  | { kind: "endurance"; distance: string; time: string; hr: string; power: string; elev: string; rpe: number; mood: number; note: string };

const short = (d: string) => `${formatDay(d, { weekday: "short" })} ${Number(d.slice(8))}`;

function initDraft(w: Workout, prev: Record<string, { sets: LoggedSet[] }> = {}): Draft {
  const base = { rpe: w.rpe ?? 0, mood: w.feeling ?? 0, note: w.notes ?? "" };
  if (w.plan.kind === "gym") {
    if (w.log?.kind === "gym")
      return { kind: "gym", ...base, exercises: w.log.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ reps: s.reps ?? 0, kg: s.weightKg ?? 0, done: !!s.done })) })) };
    return {
      kind: "gym",
      ...base,
      // Loads written as %1RM or RPE have no kg: start from last time's weights for that exercise.
      exercises: (w.plan as GymPlan).exercises.map((e) => {
        const last = prev[e.name.toLowerCase()]?.sets ?? [];
        return {
          name: e.name,
          sets: Array.from({ length: e.sets }, (_, i) => ({ reps: parseInt(e.reps) || 8, kg: e.loadKg ?? last[i]?.weightKg ?? last.at(-1)?.weightKg ?? 0, done: false })),
        };
      }),
    };
  }
  const l = w.log?.kind === "endurance" ? w.log : null;
  return {
    kind: "endurance",
    ...base,
    distance: l?.distanceM ? String(w.sport === "swim" ? l.distanceM : l.distanceM / 1000) : "",
    time: l?.durationS ? formatDuration(l.durationS).replace(" min", ":00") : "",
    hr: l?.avgHr ? String(l.avgHr) : "",
    power: l?.avgPower ? String(l.avgPower) : "",
    elev: l?.elevationM ? String(l.elevationM) : "",
  };
}

const firstOpenIn = (d: Draft, ei: number) => (d.kind === "gym" && d.exercises[ei] ? d.exercises[ei].sets.findIndex((s) => !s.done) : -1);

export function SessionScreen({
  w,
  readOnly,
  ownerName,
  today,
  weekItems,
  prev,
  back,
  garmin,
}: {
  garmin: boolean;
  w: Workout;
  readOnly: boolean;
  ownerName?: string;
  today: string;
  weekItems: WW[];
  prev: Record<string, { date: string; sets: LoggedSet[] }>;
  back: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const ro = readOnly;
  const [tab, setTab] = useState<"plan" | "log">(!ro && w.date <= today && w.status !== "skipped" ? "log" : "plan");
  const [draft, setDraft] = useState<Draft>(() => initDraft(w, prev));
  const [exI, setEx] = useState(0);
  const [activeSet, setActive] = useState<number | null>(() => {
    const i = firstOpenIn(initDraft(w, prev), 0);
    return i >= 0 ? i : null;
  });
  const [status, setSt] = useState(w.status);
  const [date, setDate] = useState(w.date);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState<{ items: MenuItem[]; y: number } | null>(null);
  const [onWatch, setOnWatchState] = useState(!!w.intervalsEventId);
  const [watchBusy, setWatchBusy] = useState(false);
  const toggleWatch = async (on: boolean) => {
    setWatchBusy(true);
    setOnWatchState(on);
    const r = await setOnWatch(w.id, on);
    setWatchBusy(false);
    if (r.error) {
      setOnWatchState(!on);
      toast({ message: r.error, icon: "exclamationmark.circle" });
    } else toast({ message: on ? "On your Garmin calendar · sync the watch" : "Removed from the watch", icon: "applewatch", tone: on ? "done" : undefined });
  };
  const plan = w.plan;
  const gym = draft.kind === "gym";
  const missed = status === "planned" && date < today;
  const mins = estimateMinutes(w);

  const upd = (fn: (d: Draft) => void) =>
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n);
      return n;
    });
  const changeStatus = (s: Workout["status"]) => {
    setSt(s);
    start(() => setStatus(w.id, s));
  };
  const moveTo = (d: string, reset = false) => {
    const from = date;
    setDate(d);
    start(() => moveWorkout(w.id, d));
    toast({ message: `${reset ? "Back on" : "Moved to"} ${short(d)}`, icon: "calendar.badge.clock", action: "Undo", onAction: () => (setDate(from), start(() => moveWorkout(w.id, from))) });
  };

  const menuItems: MenuItem[] | null = ro
    ? null
    : [
        { label: "Move to…", icon: "calendar.badge.clock", onClick: () => setSheet(true) },
        ...(date !== w.plannedDate ? [{ label: `Reset to ${short(w.plannedDate)}`, icon: "arrow.uturn.backward", onClick: () => moveTo(w.plannedDate, true) }] : []),
        { label: status === "skipped" ? "Unskip" : "Skip", icon: "minus.circle", onClick: () => changeStatus(status === "skipped" ? "planned" : "skipped") },
        ...(!w.cycleId
          ? [{ divider: true as const }, { label: "Delete session", icon: "trash", destructive: true, onClick: () => confirm(`Delete “${w.title}”?`) && start(() => deleteWorkout(w.id)) }]
          : []),
      ];

  // ---------------- gym logging
  const nextOpen = (d: Draft, ei: number, si: number) => {
    if (d.kind !== "gym") return null;
    const sets = d.exercises[ei].sets;
    for (let j = si + 1; j < sets.length; j++) if (!sets[j].done) return { e: ei, s: j };
    for (let k = 0; k < d.exercises.length; k++) {
      const e2 = (ei + 1 + k) % d.exercises.length;
      const ss = d.exercises[e2].sets;
      for (let m = 0; m < ss.length; m++) if (!ss[m].done) return { e: e2, s: m };
    }
    return null;
  };
  const completeSet = (copy: boolean) => {
    if (draft.kind !== "gym" || activeSet === null) return;
    const d = structuredClone(draft);
    const cur = d.exercises[exI].sets[activeSet];
    if (copy && activeSet > 0) {
      const p = d.exercises[exI].sets[activeSet - 1];
      cur.reps = p.reps;
      cur.kg = p.kg;
    }
    cur.done = true;
    setDraft(d);
    if (d.kind !== "gym") return;
    const n = nextOpen(d, exI, activeSet);
    if (!n) {
      setActive(null);
      toast({ message: "All sets done · save when ready", icon: "checkmark", tone: "done" });
      return;
    }
    if (n.e !== exI) toast({ message: `${d.exercises[exI].name} done · next ${d.exercises[n.e].name}`, icon: "checkmark", tone: "done" });
    setEx(n.e);
    setActive(n.s);
  };
  const goEx = (i: number) => {
    setEx(i);
    const j = firstOpenIn(draft, i);
    setActive(j >= 0 ? j : null);
  };

  const save = () => {
    const f = new FormData();
    if (draft.kind === "gym") f.set("gym", JSON.stringify(draft.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ reps: s.reps, weightKg: s.kg, done: s.done })) }))));
    else {
      f.set("distance", draft.distance);
      f.set("duration", draft.time);
      f.set("avgHr", draft.hr);
      f.set("avgPower", draft.power);
      f.set("elevation", draft.elev);
    }
    f.set("rpe", String(draft.rpe || ""));
    f.set("feeling", String(draft.mood || ""));
    f.set("notes", draft.note);
    start(async () => {
      try {
        await logWorkout(w.id, f);
        toast({ message: `Logged · ${w.title}`, icon: "checkmark", tone: "done" });
        router.push(back);
      } catch (e) {
        toast({ message: (e as Error).message || "Couldn't save. Check the numbers.", icon: "exclamationmark.circle" });
      }
    });
  };

  // ---------------- views
  const head = (
    <div className="s-head">
      <SportIcon sport={w.sport} tag />
      <h1>{w.title}</h1>
      <div className="meta">
        {formatDay(date, { weekday: "long", day: "numeric", month: "short" })}
        {date !== w.plannedDate && (
          <Tag kind="moved" icon="calendar.badge.clock">
            Moved from {short(w.plannedDate)}
          </Tag>
        )}
        {missed && (
          <Tag kind="missed" icon="exclamationmark.circle">
            Not done
          </Tag>
        )}
      </div>
    </div>
  );

  const statusSec = (
    <ListSection footer={ro ? `${ownerName ?? "Your partner"}’s session. View only.` : undefined}>
      <div className="status-row">
        <span>Status</span>
        {ro ? (
          <Tag kind={status === "done" ? "done" : "skipped"}>{status === "done" ? "Done" : status === "skipped" ? "Skipped" : "Planned"}</Tag>
        ) : (
          <SegmentedControl<Workout["status"]>
            size="s"
            label="Status"
            value={status}
            onChange={changeStatus}
            options={[
              { value: "planned", label: "Planned" },
              { value: "done", label: "Done" },
              { value: "skipped", label: "Skipped" },
            ]}
          />
        )}
      </div>
      <ListRow
        title="Day"
        subtitle={date !== w.plannedDate ? `Planned ${short(w.plannedDate)}` : undefined}
        detail={ro ? short(date) : undefined}
        trailing={
          ro ? undefined : (
            <div className="row-acts">
              {date !== w.plannedDate && (
                <Button variant="plain" size="s" onClick={() => moveTo(w.plannedDate, true)}>
                  Reset
                </Button>
              )}
              <Button variant="tinted" size="s" icon="calendar.badge.clock" onClick={() => setSheet(true)}>
                {short(date)}
              </Button>
            </div>
          )
        }
      />
    </ListSection>
  );

  const planView: React.ReactNode[] = [];
  if (plan.kind === "gym") {
    const groups = [...new Set(plan.exercises.map((e) => (e.notes?.startsWith("block B") ? "Block B" : "Circuit A")))];
    if (!plan.exercises.length) planView.push(<ListSection key="none"><div className="note-cell">No exercises planned. Add them while you log.</div></ListSection>);
    for (const g of groups) {
      const list = plan.exercises.filter((e) => (e.notes?.startsWith("block B") ? "Block B" : "Circuit A") === g);
      planView.push(
        <ListSection key={g} header={groups.length > 1 ? g : "Exercises"} headerTrailing={g === "Circuit A" ? `${list[0]?.sets ?? ""} rounds · ${hm(mins)}` : `${list.length} exercises`}>
          {list.map((e, i) => (
            <ListRow key={i} title={e.name} subtitle={[`${e.sets} × ${e.reps}`, e.rest && `rest ${e.rest}`, e.notes?.replace(/^(circuit A|block B)\s*·?\s*/, "")].filter(Boolean).join(" · ")} detail={e.load ?? "Bodyweight"} />
          ))}
        </ListSection>,
      );
    }
  } else if (plan.kind === "endurance") {
    const stat = heroStat(w);
    const zone = (plan.target ?? "").match(/Z\d(–\d)?/)?.[0];
    planView.push(
      <div className="tiles" key="tiles">
        <StatTile label="Distance" value={plan.distanceM ? stat?.unit === "m" ? stat.value : String(+(plan.distanceM / 1000).toFixed(1)) : "–"} unit={plan.distanceM ? (stat?.unit === "m" ? " m" : " km") : undefined} />
        <StatTile label="Time" value={mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}` : String(mins)} unit={mins >= 60 ? " h" : " min"} />
        <StatTile label="Zone" value={zone ?? "–"} />
      </div>,
    );
    if (plan.target)
      planView.push(
        <ListSection key="tg" header="Target">
          <div className="note-cell" style={{ color: "var(--label)" }}>
            {plan.target}
          </div>
        </ListSection>,
      );
    const steps = higSteps(w);
    if (steps.length)
      planView.push(
        <ListSection key="st" header="Steps">
          <IntervalSteps steps={steps} sport={w.sport} />
        </ListSection>,
      );
  }
  if (w.description)
    planView.push(
      <ListSection key="note" header="Coach note">
        <div className="note-cell">{w.description}</div>
      </ListSection>,
    );

  const feel = (
    <ListSection key="feel" header="How it felt" footer="Optional. Effort is RPE 1–10.">
      <RpeSlider value={draft.rpe} onChange={ro ? undefined : (v) => upd((d) => void (d.rpe = v))} />
      <MoodPicker value={draft.mood} onChange={ro ? undefined : (v) => upd((d) => void (d.mood = v))} />
      <textarea className="textarea" placeholder="Note" value={draft.note} readOnly={ro} onChange={(e) => upd((d) => void (d.note = e.target.value))} aria-label="Note" />
    </ListSection>
  );

  const logView: React.ReactNode[] = [];
  if (ro && !w.log) {
    logView.push(
      <ListSection key="nolog">
        <div className="note-cell">Not logged yet.</div>
      </ListSection>,
    );
  } else if (draft.kind === "gym") {
    if (!draft.exercises.length) {
      logView.push(
        <Button key="add1" variant="tinted" size="l" full icon="plus" onClick={() => (upd((d) => d.kind === "gym" && d.exercises.push({ name: "New exercise", sets: [{ reps: 8, kg: 20, done: false }] })), setActive(0))}>
          Add exercise
        </Button>,
      );
    } else {
      const ex = draft.exercises[exI];
      const pex = plan.kind === "gym" ? plan.exercises.find((e) => e.name === ex.name) : undefined;
      const last = prev[ex.name.toLowerCase()];
      const doneSets = ex.sets.filter((x) => x.done).length;
      logView.push(
        <div className="stack" key="cur">
          <div className="ex-head">
            <div>
              <div className="over">
                Exercise {exI + 1} of {draft.exercises.length}
              </div>
              <h2>
                <input
                  value={ex.name}
                  readOnly={ro}
                  onChange={(e) => upd((d) => d.kind === "gym" && (d.exercises[exI].name = e.target.value))}
                  aria-label="Exercise name"
                  style={{ font: "inherit", letterSpacing: "inherit", border: 0, background: "transparent", color: "inherit", padding: 0, width: "100%", outline: "none" }}
                />
              </h2>
            </div>
            <div className="meta">
              {pex ? `${pex.sets} × ${pex.reps}${pex.load ? ` @ ${pex.load}` : ""}` : "Extra"}
              <br />
              {pex?.rest ? `Rest ${pex.rest}` : ""}
            </div>
          </div>
          <ListSection>
            {ex.sets.map((x, si) => (
              <SetRow
                key={`${exI}-${si}`}
                index={si + 1}
                reps={x.reps}
                kg={x.kg}
                last={last?.sets[si] ? `${last.sets[si].reps ?? "?"} × ${last.sets[si].weightKg ?? 0}` : undefined}
                done={x.done}
                active={!ro && activeSet === si}
                readOnly={ro}
                onToggle={(v) => upd((d) => d.kind === "gym" && (d.exercises[exI].sets[si].done = v))}
                onSelect={ro ? undefined : () => setActive(si)}
              />
            ))}
          </ListSection>
          {!ro && (
            <div className="ex-tools">
              <Button variant="bordered" size="s" icon="chevron.left" disabled={exI === 0} onClick={() => goEx(exI - 1)}>
                Previous
              </Button>
              <Button
                variant="bordered"
                size="s"
                icon="plus"
                onClick={() => {
                  upd((d) => {
                    if (d.kind !== "gym") return;
                    const ss = d.exercises[exI].sets;
                    const l = ss[ss.length - 1] ?? { reps: 8, kg: 20 };
                    ss.push({ reps: l.reps, kg: l.kg, done: false });
                  });
                  setActive(ex.sets.length);
                }}
              >
                Set
              </Button>
              <Button variant="bordered" size="s" icon="minus" disabled={ex.sets.length <= 1} onClick={() => (upd((d) => void (d.kind === "gym" && d.exercises[exI].sets.pop())), setActive(null))}>
                Set
              </Button>
              <span style={{ flex: 1 }} />
              <Button variant="bordered" size="s" disabled={exI === draft.exercises.length - 1} onClick={() => goEx(exI + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>,
      );
      logView.push(
        <ListSection key="all" header="All exercises" headerTrailing={`${doneSets}/${ex.sets.length} sets here`}>
          {draft.exercises.map((e, i) => {
            const dn = e.sets.filter((x) => x.done).length;
            return (
              <ListRow
                key={i}
                title={e.name}
                subtitle={`${e.sets.length} sets`}
                detail={dn === e.sets.length ? undefined : `${dn}/${e.sets.length}`}
                trailing={dn === e.sets.length ? <Symbol name="checkmark.circle.fill" size={22} style={{ color: "var(--tint-ink)" }} /> : undefined}
                chevron={i !== exI}
                onClick={() => goEx(i)}
              />
            );
          })}
          {!ro && (
            <ListRow
              title={<span style={{ color: "var(--tint-ink)" }}>Add exercise</span>}
              leading={<Symbol name="plus" size={18} weight="semibold" style={{ color: "var(--tint-ink)" }} />}
              onClick={() => {
                upd((d) => d.kind === "gym" && d.exercises.push({ name: "New exercise", sets: [{ reps: 8, kg: 20, done: false }] }));
                setEx(draft.exercises.length);
                setActive(0);
              }}
            />
          )}
        </ListSection>,
      );
    }
    if (w.intervalsActivityId) logView.push(<Recorded key="rec" device={w.activityDevice} />);
    logView.push(feel);
  } else {
    const unit = w.sport === "swim" ? "m" : "km";
    let dv = "";
    try {
      const m = draft.distance ? parseDistance(/[a-z]/i.test(draft.distance) ? draft.distance : `${draft.distance}${unit}`) : undefined;
      const s = draft.time ? parseDuration(draft.time) : undefined;
      dv = formatPace(w.sport, m, s);
    } catch {}
    logView.push(
      <ListSection key="fields" header="What you did" footer={w.sport === "other" ? undefined : w.sport === "swim" ? "Pace is per 100 m." : w.sport === "bike" ? "Speed comes from distance and time." : "Pace comes from distance and time."}>
        {w.sport !== "other" && (
          <Field id="f-dist" label="Distance" suffix={unit} inputMode="decimal" placeholder={plan.kind === "endurance" && plan.distanceM ? String(w.sport === "swim" ? plan.distanceM : plan.distanceM / 1000) : "0"} value={draft.distance} readOnly={ro} onChange={(v) => upd((d) => d.kind === "endurance" && (d.distance = v))} />
        )}
        <Field id="f-time" label="Time" suffix="h:mm:ss" inputMode="numeric" placeholder={mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}:00` : `${mins}:00`} value={draft.time} readOnly={ro} onChange={(v) => upd((d) => d.kind === "endurance" && (d.time = v))} />
        <Field id="f-hr" label="Avg heart rate" suffix="bpm" inputMode="numeric" placeholder="–" value={draft.hr} readOnly={ro} onChange={(v) => upd((d) => d.kind === "endurance" && (d.hr = v))} />
        {w.sport === "bike" && <Field id="f-pw" label="Avg power" suffix="W" inputMode="numeric" placeholder="–" value={draft.power} readOnly={ro} onChange={(v) => upd((d) => d.kind === "endurance" && (d.power = v))} />}
        {w.sport === "run" && <Field id="f-el" label="Elevation" suffix="m" inputMode="numeric" placeholder="–" value={draft.elev} readOnly={ro} onChange={(v) => upd((d) => d.kind === "endurance" && (d.elev = v))} />}
        {w.sport !== "other" && <ListRow title={w.sport === "bike" ? "Speed" : "Pace"} trailing={<span className="derived">{dv || "–"}</span>} />}
      </ListSection>,
    );
    if (w.intervalsActivityId) logView.push(<Recorded key="rec" device={w.activityDevice} />);
    logView.push(feel);
  }
  if (!ro)
    logView.push(
      <Button key="save" variant="prominent" size="xl" full icon="checkmark" disabled={pending} onClick={save}>
        {pending ? "Saving…" : w.log ? "Save changes" : "Save and mark done"}
      </Button>,
    );

  const cur = !ro && tab === "log" && gym && activeSet !== null && draft.kind === "gym" ? draft.exercises[exI]?.sets[activeSet] : null;
  const editor = cur && draft.kind === "gym" && activeSet !== null && (
    <div className="hig-seted hig-glass is-strong" key="ed">
      <div className="hig-seted-head">
        <b>
          Set {activeSet + 1} of {draft.exercises[exI].sets.length}
        </b>
        {cur.kg > 0 && (
          <span>
            Est. 1RM <b>{Math.round(estimate1RM(cur.kg, cur.reps))} kg</b>
          </span>
        )}
      </div>
      <div className="hig-seted-steppers">
        <Stepper label="Reps" value={cur.reps} onChange={(v) => upd((d) => d.kind === "gym" && (d.exercises[exI].sets[activeSet].reps = v))} />
        <Stepper label="Load" suffix="kg" step={2.5} value={cur.kg} onChange={(v) => upd((d) => d.kind === "gym" && (d.exercises[exI].sets[activeSet].kg = v))} />
      </div>
      <div className="hig-seted-actions">
        <Button variant="bordered" size="l" icon="square.on.square" disabled={activeSet === 0} onClick={() => completeSet(true)}>
          Same as last
        </Button>
        <Button variant="prominent" size="l" icon="checkmark" onClick={() => completeSet(false)}>
          Done set
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Screen
        title={w.title}
        large={false}
        inlineSub={`${SPORTS[w.sport].label} · ${short(date)}`}
        leading={<IconButton icon="chevron.left" label="Back" href={back} />}
        trailing={menuItems ? <IconButton icon="ellipsis" label="More" onClick={(e) => setMenu({ items: menuItems, y: e.currentTarget.getBoundingClientRect().bottom + 8 })} /> : null}
        bodyClass={editor ? "pad-editor" : "pad-none"}
        floating={
          <>
            <ToastSlot />
            {editor}
          </>
        }
      >
        {head}
        <SegmentedControl<"plan" | "log">
          label="View"
          full
          value={tab}
          onChange={setTab}
          options={[
            { value: "plan", label: "Plan" },
            { value: "log", label: ro || w.log ? "Log" : "Log it" },
          ]}
        />
        {tab === "plan" ? (
          <>
            {statusSec}
            {!ro && canSendToWatch(w) && status !== "done" && (
              <ListSection footer={garmin ? (onWatch ? "Moves and skips follow on the watch automatically." : "Sends the steps and targets to your Garmin calendar via intervals.icu.") : undefined}>
                {garmin ? (
                  <Toggle label="Send to watch" sub={onWatch ? "On your Garmin calendar" : undefined} checked={onWatch} disabled={watchBusy} onChange={toggleWatch} />
                ) : (
                  <ListRow href="/settings/garmin" leading={<Symbol name="applewatch" size={18} weight="semibold" style={{ color: "var(--label-secondary)" }} />} title="Send to watch" subtitle="Connect Garmin first" chevron />
                )}
              </ListSection>
            )}
            {planView}
          </>
        ) : (
          logView
        )}
      </Screen>
      {sheet && <MoveSheet s={{ ...w, date }} items={weekItems} today={today} onClose={() => setSheet(false)} onMove={(d, reset) => moveTo(d, reset)} />}
      {menu && <MenuLayer items={menu.items} y={menu.y} label="Session actions" onClose={() => setMenu(null)} />}
    </>
  );
}

/** Garmin attribution (required when showing Garmin-sourced data). */
function Recorded({ device }: { device: string | null }) {
  return (
    <div className="ro-note" style={{ padding: "0 4px" }}>
      <Symbol name="applewatch" size={15} weight="semibold" />
      Recorded on {device?.startsWith("Garmin") ? device : `Garmin${device ? ` ${device}` : ""}`} · synced via intervals.icu
    </div>
  );
}
