"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Race, Sport } from "@/db/schema";
import { Symbol } from "@/components/hig/symbol";
import { Button, Field, ListSection, Pill, ProgressView, SegmentedControl, Sheet, SportIcon, Toggle, cx } from "@/components/hig/ui";
import { useToast } from "@/components/hig/toast";
import { addRace, addTarget, deleteTarget, updateRace, updateTarget, type RaceInput, type TargetInput } from "@/app/actions/races";
import { KIND_PRESETS, TARGET_KIND_WORD, countdownTxt, daysTo, fmtTime, parseTime, raceLegs, tPct, tVal, type RaceKind, type TargetView } from "@/lib/races";
import { formatDay } from "@/lib/dates";

export type RaceLite = Pick<Race, "id" | "name" | "date" | "kind" | "dist" | "priority" | "who" | "goalTime" | "legGoals" | "place" | "note" | "result" | "resultPlace" | "onCal">;
export type Person = { id: string; name: string };
export type AutoNow = {
  e1rm: Record<string, number | null>;
  consistency: number | null;
  best10k: number | null;
  best5k: number | null;
  volume: Record<"swim" | "bike" | "run" | "all", number>;
};

const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });
const SPORT_WORD: Record<Sport, string> = { swim: "Swim", bike: "Bike", run: "Run", gym: "Gym", other: "Other" };

export function RaceIcon({ r, size }: { r: Pick<Race, "priority">; size?: "l" }) {
  return (
    <span className={cx("race-ic", `p-${r.priority}`)} role="img" aria-label={`${r.priority} race`}>
      <Symbol name="flag" size={size === "l" ? 24 : 18} weight="semibold" />
      <b>{r.priority}</b>
    </span>
  );
}

export function RaceRow({ r, today, detail, showDate }: { r: RaceLite; today: string; detail?: boolean; showDate?: boolean }) {
  const n = daysTo(today, r.date);
  return (
    <Link href={`/races/${r.id}`} className="hig-session is-race" aria-label={`${r.name}, ${r.priority} race`}>
      <RaceIcon r={r} />
      <div className="hig-session-text">
        <span className="title">{r.name}</span>
        <span className="target">
          {r.priority} race · {r.dist}
          {r.result ? ` · ${r.result}` : r.goalTime ? ` · goal ${r.goalTime}` : ""}
        </span>
        {showDate && (
          <span className="tags">
            <span className="hig-tag t-skipped">{formatDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</span>
          </span>
        )}
      </div>
      {detail && <span className="race-days">{n >= 0 ? (n === 0 ? "Today" : `${n} d`) : r.result || "Done"}</span>}
      <Symbol name="chevron.right" size={14} weight="semibold" className="chev" />
    </Link>
  );
}

const PRI_OPTS = [
  { value: "A" as const, label: "A" },
  { value: "B" as const, label: "B" },
  { value: "C" as const, label: "C" },
];
export function whoOptions(me: Person, partner: Person | null) {
  return partner
    ? [
        { value: me.id, label: "Me" },
        { value: partner.id, label: partner.name.split(" ")[0] },
        { value: "both", label: "Both" },
      ]
    : null;
}

/** Add or edit a race. */
export function RaceSheet({ me, partner, today, initial, onClose, onSaved }: { me: Person; partner: Person | null; today: string; initial?: RaceLite; onClose: () => void; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    name: initial?.name ?? "",
    date: initial?.date ?? "",
    kind: (initial?.kind ?? "tri") as RaceKind,
    dist: initial?.dist ?? "Olympic",
    priority: initial?.priority ?? "B",
    who: initial?.who ?? (partner ? "both" : me.id),
    goalTime: initial?.goalTime ?? "",
    place: initial?.place ?? "",
    note: initial?.note ?? "",
    result: initial?.result ?? "",
    resultPlace: initial?.resultPlace ?? "",
    legGoals: { ...(initial?.legGoals ?? {}) } as Partial<Record<"swim" | "bike" | "run", string>>,
    onCal: initial ? !!initial.onCal : true,
  });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) =>
    setV((o) => {
      const n = { ...o, [k]: x };
      if (k === "kind") n.dist = KIND_PRESETS[x as RaceKind][Math.min(1, KIND_PRESETS[x as RaceKind].length - 1)];
      return n;
    });
  const ok = !!v.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && !pending;
  const past = !!v.date && v.date < today;
  const legs = raceLegs({ dist: v.dist, kind: v.kind }).filter(([s]) => s === "swim" || s === "bike" || s === "run");
  const go = () => {
    if (!ok) return;
    const data: RaceInput = { ...v, name: v.name.trim() };
    start(async () => {
      const r = initial ? await updateRace(initial.id, data) : await addRace(data);
      if (r.error) return toast({ message: r.error, icon: "exclamationmark.circle" });
      onClose();
      if (initial) toast({ message: "Race saved", icon: "checkmark", tone: "done" });
      else {
        const id = (r as { id: string }).id;
        toast({ message: `${data.name} added · ${countdownTxt(daysTo(today, data.date))}`, icon: "flag", tone: "done", action: "Open", onAction: () => onSaved?.(id) });
      }
    });
  };
  const kinds: [RaceKind, string][] = [
    ["tri", "Triathlon"],
    ["run", "Run"],
    ["bike", "Bike"],
    ["swim", "Swim"],
  ];
  const whoOpts = whoOptions(me, partner);
  return (
    <Sheet title={initial ? "Edit race" : "Add race"} subtitle={initial ? initial.name : "Shows on Home and in the week"} onClose={onClose} onDone={go} doneLabel={initial ? "Save" : "Add race"} doneDisabled={!ok}>
      <div className="pills" role="radiogroup" aria-label="Race type">
        {kinds.map(([k, label]) =>
          k === "tri" ? (
            <Pill key={k} icon="flag" selected={v.kind === k} onClick={() => set("kind", k)}>
              {label}
            </Pill>
          ) : (
            <Pill key={k} sport={k} selected={v.kind === k} onClick={() => set("kind", k)} />
          ),
        )}
      </div>
      <ListSection>
        <Field id="race-name" label="Name" placeholder="National championship" value={v.name} onChange={(x) => set("name", x)} />
        <div className="hig-field">
          <label htmlFor="race-date">Date</label>
          <div className="hig-field-in">
            <input id="race-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </div>
        </div>
        <Field id="race-goal" label="Goal time" placeholder="2:00:00" inputMode="numeric" value={v.goalTime} onChange={(x) => set("goalTime", x)} />
        {initial && <Field id="race-place" label="Place" placeholder="Lake Amatitlán" value={v.place} onChange={(x) => set("place", x)} />}
      </ListSection>
      <div className="sheet-label">Distance</div>
      <div className="pills">
        {KIND_PRESETS[v.kind].map((d) => (
          <Pill key={d} selected={v.dist === d} onClick={() => set("dist", d)}>
            {d}
          </Pill>
        ))}
      </div>
      {initial && legs.length > 1 && (
        <ListSection header="Leg goals" footer="Free text: a time, a pace or a speed (e.g. 19:30, 3:30/km, 39 km/h).">
          {legs.map(([s, d]) => (
            <Field
              key={s}
              id={`leg-${s}`}
              label={`${SPORT_WORD[s]} · ${d}`}
              placeholder={s === "swim" ? "19:30" : s === "bike" ? "39 km/h" : "35:00"}
              value={v.legGoals[s as "swim"] ?? ""}
              onChange={(x) => set("legGoals", { ...v.legGoals, [s]: x })}
            />
          ))}
        </ListSection>
      )}
      <ListSection footer="A = season goal with a 2-week taper. B = 1 week. C = a training race.">
        <div className="status-row">
          <span>Priority</span>
          <SegmentedControl size="s" label="Priority" value={v.priority} onChange={(x) => set("priority", x)} options={PRI_OPTS} />
        </div>
        {whoOpts && (
          <div className="status-row">
            <span>Who</span>
            <SegmentedControl size="s" label="Who races" value={v.who} onChange={(x) => set("who", x)} options={whoOpts} />
          </div>
        )}
        <Toggle label="Show in Week" checked={v.onCal} onChange={(x) => set("onCal", x)} />
      </ListSection>
      {initial && past && (
        <ListSection header="Result">
          <Field id="race-result" label="Time" placeholder="1:58:40" inputMode="numeric" value={v.result} onChange={(x) => set("result", x)} />
          <Field id="race-rplace" label="Place" placeholder="4th" value={v.resultPlace} onChange={(x) => set("resultPlace", x)} />
        </ListSection>
      )}
      {initial && (
        <ListSection header="Note">
          <div className="hig-field">
            <div className="hig-field-in">
              <textarea aria-label="Note" rows={3} value={v.note} placeholder="Course, logistics, what to remember" onChange={(e) => set("note", e.target.value)} style={{ width: "100%", resize: "vertical", border: 0, background: "transparent", font: "inherit", color: "inherit", outline: "none" }} />
            </div>
          </div>
        </ListSection>
      )}
      <Button variant="prominent" size="xl" full icon={initial ? "checkmark" : "flag"} disabled={!ok} onClick={go}>
        {initial ? "Save race" : ok ? `Add race · ${countdownTxt(daysTo(today, v.date))} to go`.replace("Today to go", "today") : "Add race"}
      </Button>
    </Sheet>
  );
}

/* ---------------- Targets ---------------- */

export function TargetRow({ t, today, onOpen }: { t: TargetView; today: string; onOpen: () => void }) {
  const pc = tPct(t);
  const hit = pc >= 1;
  const days = t.due ? daysTo(today, t.due) : null;
  return (
    <div className="tg-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <SportIcon sport={t.sport} size="s" />
      <div className="tg-text">
        <div className="tg-top">
          <b>{t.title}</b>
          {hit ? <Symbol name="checkmark.circle.fill" size={18} style={{ color: "var(--tint-ink)" }} /> : <span>{Math.round(pc * 100)}%</span>}
        </div>
        <ProgressView value={pc} thin />
        <span className="tg-sub">
          Now {tVal(t, t.now)} · goal {tVal(t, t.goalValue)}
          {t.race ? (
            <>
              {" · "}
              <span className="tg-race">{t.race.name}</span>
              {days !== null && days >= 0 ? `, ${days} d` : ""}
            </>
          ) : days !== null && days >= 0 ? (
            ` · by ${dm(t.due!)}`
          ) : t.note ? (
            ` · ${t.note}`
          ) : (
            ""
          )}
        </span>
      </div>
    </div>
  );
}

type TType = "race" | "e1rm" | "volume" | "consistency" | "custom";
const TTYPES: { v: TType; label: string; icon: string }[] = [
  { v: "race", label: "Race time", icon: "flag" },
  { v: "e1rm", label: "Strength", icon: "dumbbell" },
  { v: "volume", label: "Volume", icon: "chart.bar" },
  { v: "consistency", label: "Consistency", icon: "checkmark" },
  { v: "custom", label: "Custom", icon: "target" },
];

/** Up to six races for a picker: A races first, then the soonest. */
function pickRaces(rs: RaceLite[]) {
  const pr = { A: 0, B: 1, C: 2 };
  return [...rs].sort((a, b) => pr[a.priority] - pr[b.priority] || a.date.localeCompare(b.date)).slice(0, 6);
}

function num(s: string): number | null {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() && Number.isFinite(n) ? n : null;
}

export function AddTargetSheet({ today, races, autoNow, raceId, onClose }: { today: string; races: RaceLite[]; autoNow: AutoNow; raceId?: string; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const ups = pickRaces(races.filter((r) => r.date >= today));
  const [type, setType] = useState<TType>("race");
  const [race, setRace] = useState<string | null>(raceId ?? null);
  const [dist, setDist] = useState<"best10k" | "best5k">("best10k");
  const [exercise, setExercise] = useState(Object.keys(autoNow.e1rm)[0] ?? "");
  const [volSport, setVolSport] = useState<"swim" | "bike" | "run" | "all">("run");
  const [sport, setSport] = useState<Sport>("run");
  const [title, setTitle] = useState("");
  const [now, setNow] = useState("");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("km");

  const isTime = type === "race" || (type === "custom" && (goal.includes(":") || now.includes(":")));
  const autoVal: number | null =
    type === "race" ? autoNow[dist] : type === "e1rm" ? autoNow.e1rm[exercise] ?? null : type === "volume" ? autoNow.volume[volSport] : type === "consistency" ? autoNow.consistency : null;
  const startVal = type === "volume" ? 0 : type === "consistency" ? 0 : autoVal ?? (isTime ? parseTime(now) : num(now));
  const goalVal = isTime ? parseTime(goal) : num(goal);
  const unitOut = isTime ? "time" : type === "e1rm" ? "kg" : type === "volume" ? "km" : type === "consistency" ? "%" : unit.trim() || null;
  const r = ups.find((x) => x.id === race);
  const fmt = (x: number) => (isTime ? fmtTime(x) : `${x}${unitOut === "%" ? "%" : unitOut ? ` ${unitOut}` : ""}`);
  const autoTitle =
    goalVal === null
      ? ""
      : type === "race"
        ? `${dist === "best10k" ? "10 km" : "5 km"} under ${fmtTime(goalVal)}`
        : type === "e1rm"
          ? `${exercise} ${goalVal} kg`
          : type === "volume"
            ? `${volSport === "all" ? "Train" : SPORT_WORD[volSport]} ${goalVal} km${r ? ` before ${r.name}` : " this season"}`
            : type === "consistency"
              ? `Do ${goalVal}% of sessions`
              : "";
  const finalTitle = title.trim() || autoTitle;
  const ok = !!finalTitle && startVal !== null && goalVal !== null && (type !== "e1rm" || !!exercise) && startVal !== goalVal && !pending;

  const go = () => {
    if (!ok) return;
    const v: TargetInput = {
      kind: type === "race" ? dist : type,
      sport: type === "race" ? "run" : type === "e1rm" ? "gym" : type === "volume" ? (volSport === "all" ? "other" : volSport) : type === "consistency" ? "other" : sport,
      title: finalTitle,
      metricKey: type === "e1rm" ? exercise : type === "volume" ? volSport : null,
      startValue: startVal!,
      goalValue: goalVal!,
      unit: unitOut,
      lowerIsBetter: isTime,
      raceId: race,
      due: r?.date ?? null,
    };
    start(async () => {
      const res = await addTarget(v);
      if (res.error) return toast({ message: res.error, icon: "exclamationmark.circle" });
      onClose();
      toast({ message: "Target added", icon: "target", tone: "done" });
    });
  };

  return (
    <Sheet title="Add target" subtitle={r ? `For ${r.name}` : "Tracked on Home"} onClose={onClose} onDone={go} doneLabel="Add target" doneDisabled={!ok}>
      <div className="pills" role="radiogroup" aria-label="Target type">
        {TTYPES.map((t) => (
          <Pill key={t.v} icon={t.icon} selected={type === t.v} onClick={() => setType(t.v)}>
            {t.label}
          </Pill>
        ))}
      </div>

      {type === "race" && (
        <div className="pills" role="radiogroup" aria-label="Distance">
          <Pill sport="run" selected={dist === "best10k"} onClick={() => setDist("best10k")}>
            10 km
          </Pill>
          <Pill sport="run" selected={dist === "best5k"} onClick={() => setDist("best5k")}>
            5 km
          </Pill>
        </div>
      )}
      {type === "e1rm" && (
        <>
          <div className="sheet-label">Exercise</div>
          {Object.keys(autoNow.e1rm).length ? (
            <div className="pills">
              {Object.keys(autoNow.e1rm)
                .slice(0, 12)
                .map((n) => (
                  <Pill key={n} selected={exercise === n} onClick={() => setExercise(n)}>
                    {n}
                  </Pill>
                ))}
            </div>
          ) : (
            <ListSection>
              <Field id="tg-ex" label="Exercise" placeholder="Back squat" value={exercise} onChange={setExercise} />
            </ListSection>
          )}
        </>
      )}
      {type === "volume" && (
        <div className="pills" role="radiogroup" aria-label="Sport">
          {(["swim", "bike", "run"] as const).map((s) => (
            <Pill key={s} sport={s} selected={volSport === s} onClick={() => setVolSport(s)} />
          ))}
          <Pill icon="chart.bar" selected={volSport === "all"} onClick={() => setVolSport("all")}>
            All
          </Pill>
        </div>
      )}
      {type === "custom" && (
        <div className="pills" role="radiogroup" aria-label="Sport">
          {(["swim", "bike", "run", "gym", "other"] as const).map((s) => (
            <Pill key={s} sport={s} selected={sport === s} onClick={() => setSport(s)} />
          ))}
        </div>
      )}

      <ListSection
        footer={
          type === "custom"
            ? "You update “now” yourself. Times like 36:45 count down."
            : autoVal !== null
              ? `Now comes from your logged sessions${type === "volume" ? " since the season started" : ""} and updates on its own.`
              : type === "race"
                ? "No logged run that long yet: enter your current best. It updates when you log a faster one."
                : "Tracked from your logged sessions."
        }
      >
        {type === "custom" || (autoVal === null && type !== "volume" && type !== "consistency") ? (
          <Field id="tg-now" label="Now" inputMode={isTime ? "numeric" : "decimal"} placeholder={isTime ? "36:45" : type === "e1rm" ? "100" : "120"} suffix={type === "e1rm" ? "kg" : undefined} value={now} onChange={setNow} />
        ) : (
          <div className="hig-row">
            <div className="hig-row-text">
              <span className="title">Now</span>
            </div>
            <span className="detail">{autoVal !== null ? fmt(autoVal) : "–"}</span>
          </div>
        )}
        <Field
          id="tg-goal"
          label="Goal"
          inputMode={isTime ? "numeric" : "decimal"}
          placeholder={type === "race" ? (dist === "best10k" ? "35:00" : "16:30") : type === "e1rm" ? "120" : type === "volume" ? "1000" : type === "consistency" ? "85" : "400"}
          suffix={type === "e1rm" ? "kg" : type === "volume" ? "km" : type === "consistency" ? "%" : undefined}
          value={goal}
          onChange={setGoal}
        />
        {type === "custom" && !isTime && <Field id="tg-unit" label="Unit" placeholder="km" value={unit} onChange={setUnit} />}
        <Field id="tg-title" label="Name" placeholder={autoTitle || "Run 400 km this season"} value={title} onChange={setTitle} />
      </ListSection>

      {ups.length > 0 && (
        <>
          <div className="sheet-label">For a race</div>
          <div className="pills" role="radiogroup" aria-label="Race">
            <Pill selected={!race} onClick={() => setRace(null)}>
              No race
            </Pill>
            {ups.map((x) => (
              <Pill key={x.id} icon="flag" selected={race === x.id} onClick={() => setRace(x.id)}>
                {x.name.length > 22 ? `${x.name.slice(0, 21)}…` : x.name}
              </Pill>
            ))}
          </div>
        </>
      )}
      <Button variant="prominent" size="xl" full icon="target" disabled={!ok} onClick={go}>
        {ok && goalVal !== null ? `Add target · ${fmt(goalVal)}` : "Add target"}
      </Button>
    </Sheet>
  );
}

export function TargetSheet({ t, today, races, onClose }: { t: TargetView; today: string; races: RaceLite[]; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const time = !!t.lowerIsBetter && (t.unit === "time" || !t.unit);
  const show = (x: number) => (time ? fmtTime(x) : String(x));
  const [now, setNow] = useState(show(t.now));
  const [goal, setGoal] = useState(show(t.goalValue));
  const [race, setRace] = useState<string | null>(t.raceId);
  const parse = (s: string) => (time ? parseTime(s) : num(s));
  const ups = pickRaces(races.filter((r) => r.date >= today || r.id === t.raceId));
  const save = () =>
    start(async () => {
      const g = parse(goal);
      const n = parse(now);
      await updateTarget(t.id, { goalValue: g ?? undefined, currentValue: !t.auto && n !== null ? n : undefined, raceId: race });
      onClose();
      toast({ message: "Target saved", icon: "checkmark", tone: "done" });
    });
  return (
    <Sheet title={t.title} subtitle={`${TARGET_KIND_WORD[t.kind]}${t.auto ? " · updates on its own" : ""}`} onClose={onClose} onDone={save} doneLabel="Save" doneDisabled={pending}>
      <ListSection padded>
        <div className="tg-text">
          <div className="tg-top">
            <b>
              {tVal(t, t.startValue)} → {tVal(t, t.goalValue)}
            </b>
            <span>{Math.round(tPct(t) * 100)}%</span>
          </div>
          <ProgressView value={tPct(t)} />
          <span className="tg-sub">
            Now {tVal(t, t.now)}
            {t.note ? ` · ${t.note}` : ""}
          </span>
        </div>
      </ListSection>
      <ListSection footer={t.auto ? "“Now” comes from your logged sessions." : "Update “now” whenever you test or race."}>
        {!t.auto && <Field id="tge-now" label="Now" inputMode={time ? "numeric" : "decimal"} value={now} onChange={setNow} suffix={time ? undefined : t.unit ?? undefined} />}
        <Field id="tge-goal" label="Goal" inputMode={time ? "numeric" : "decimal"} value={goal} onChange={setGoal} suffix={time ? undefined : t.unit ?? undefined} />
      </ListSection>
      {ups.length > 0 && (
        <>
          <div className="sheet-label">For a race</div>
          <div className="pills">
            <Pill selected={!race} onClick={() => setRace(null)}>
              No race
            </Pill>
            {ups.map((x) => (
              <Pill key={x.id} icon="flag" selected={race === x.id} onClick={() => setRace(x.id)}>
                {x.name.length > 22 ? `${x.name.slice(0, 21)}…` : x.name}
              </Pill>
            ))}
          </div>
        </>
      )}
      <Button variant="prominent" size="l" full icon="checkmark" disabled={pending} onClick={save}>
        Save
      </Button>
      <Button
        variant="plain"
        size="l"
        full
        icon="trash"
        destructive
        onClick={() =>
          start(async () => {
            await deleteTarget(t.id);
            onClose();
            toast({ message: "Target deleted", icon: "trash" });
          })
        }
      >
        Delete target
      </Button>
    </Sheet>
  );
}
