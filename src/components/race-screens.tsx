"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Symbol } from "@/components/hig/symbol";
import { Button, ButtonLink, IconButton, ListRow, ListSection, MenuLayer, type MenuItem, Screen, SegmentedControl, SportIcon, StatTile, Toggle } from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";
import { addSeasonRaces, deleteRace, restoreRace, updateRace } from "@/app/actions/races";
import { AddTargetSheet, RaceRow, RaceSheet, TargetRow, TargetSheet, whoOptions, type AutoNow, type Person, type RaceLite } from "@/components/races-ui";
import { KIND_WORD, fmtTime, parseTime, raceLegs, taperStart, type TargetView } from "@/lib/races";
import type { Race, Sport } from "@/db/schema";
import { diffDays, formatDay, isoWeek } from "@/lib/dates";

const SPORT_WORD: Record<Sport, string> = { swim: "Swim", bike: "Bike", run: "Run", gym: "Gym", other: "Race" };
const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });

export function RacesScreen({ me, partner, today, races }: { me: Person; partner: Person | null; today: string; races: RaceLite[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const up = races.filter((r) => r.date >= today);
  const past = races.filter((r) => r.date < today).reverse();
  return (
    <>
      <Screen
        title="Races"
        large={false}
        leading={<IconButton icon="chevron.left" label="Back" href="/" />}
        trailing={<IconButton icon="plus" label="Add race" variant="glassProminent" onClick={() => setAdding(true)} />}
        floating={<ToastSlot />}
      >
        <ListSection header="Upcoming" footer="A = season goal, 2-week taper. B = 1-week taper. C = training race.">
          {up.length ? up.map((r) => <RaceRow key={r.id} r={r} today={today} detail showDate />) : <div className="note-cell">No races yet.</div>}
        </ListSection>
        {past.length > 0 && (
          <ListSection header="Past">
            {past.map((r) => (
              <RaceRow key={r.id} r={r} today={today} detail showDate />
            ))}
          </ListSection>
        )}
        <Button variant="prominent" size="xl" full icon="plus" onClick={() => setAdding(true)}>
          Add race
        </Button>
        <Button
          variant="bordered"
          size="l"
          full
          icon="calendar"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await addSeasonRaces();
              toast(r.added ? { message: `${r.added} season races added · placeholder dates`, icon: "flag", tone: "done" } : { message: "The season races are already here", icon: "checkmark" });
              router.refresh();
            })
          }
        >
          Add the season plan’s races
        </Button>
      </Screen>
      {adding && <RaceSheet me={me} partner={partner} today={today} onClose={() => setAdding(false)} onSaved={(id) => router.push(`/races/${id}`)} />}
    </>
  );
}

function secs(v: string | null) {
  return parseTime(v);
}

export function RaceScreen({
  race,
  me,
  partner,
  today,
  plannedTo,
  inCycle,
  targets,
  races,
  autoNow,
}: {
  race: Race;
  me: Person;
  partner: Person | null;
  today: string;
  plannedTo: string;
  inCycle: { name: string; focus: string } | null;
  targets: TargetView[];
  races: RaceLite[];
  autoNow: AutoNow;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [r, setR] = useState(race);
  const [prev, setPrev] = useState(race);
  if (race !== prev) {
    setPrev(race);
    setR(race);
  }
  const [sheet, setSheet] = useState<{ name: "edit" } | { name: "addTarget" } | { name: "target"; id: string } | null>(null);
  const [menu, setMenu] = useState<{ items: MenuItem[]; y: number; label: string } | null>(null);
  const n = diffDays(r.date, today);
  const past = n < 0;
  const taper = taperStart(r) ?? r.date;
  const patch = (p: Partial<Race>, server: Parameters<typeof updateRace>[1]) => {
    setR((o) => ({ ...o, ...p }));
    start(async () => {
      const res = await updateRace(r.id, server);
      if (res.error) toast({ message: res.error, icon: "exclamationmark.circle" });
    });
  };
  const whoOpts = whoOptions(me, partner);
  const vs = r.result && r.goalTime && secs(r.result) !== null && secs(r.goalTime) !== null ? secs(r.result)! - secs(r.goalTime)! : null;
  const target = sheet?.name === "target" ? targets.find((t) => t.id === sheet.id) : null;

  return (
    <>
      <Screen
        title={r.name}
        large={false}
        inlineSub={`${r.priority} race · ${formatDay(r.date, { weekday: "short", day: "numeric", month: "short" })}`}
        leading={<IconButton icon="chevron.left" label="Back" onClick={() => router.back()} />}
        trailing={<IconButton icon="pencil" label="Edit race" onClick={() => setSheet({ name: "edit" })} />}
        floating={<ToastSlot />}
      >
        <div className="s-head">
          <span className="hig-sporttag s-other">
            <Symbol name="flag" size={14} weight="semibold" />
            {r.priority} race · {KIND_WORD[r.kind]}
          </span>
          <h1>{r.name}</h1>
          <div className="meta">
            {formatDay(r.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {r.place && (
              <span className="meta-pl">
                <Symbol name="mappin" size={14} weight="semibold" />
                {r.place}
              </span>
            )}
          </div>
        </div>
        <div className="tiles">
          {past ? <StatTile label="Result" value={r.result || "–"} /> : <StatTile label="Days to go" value={String(n)} />}
          <StatTile label={past ? "Goal was" : "Goal"} value={r.goalTime || "–"} />
          {past ? <StatTile label="Vs goal" value={vs === null ? "–" : `${vs <= 0 ? "−" : "+"}${fmtTime(Math.abs(vs))}`} /> : <StatTile label="Weeks" value={String(Math.ceil(n / 7))} />}
        </div>
        <ListSection header={r.dist} footer={past ? undefined : "Tap Edit to set a goal for each leg."}>
          {raceLegs(r).map(([s, d], i) => (
            <ListRow key={i} leading={<SportIcon sport={s} />} title={SPORT_WORD[s]} subtitle={d} detail={r.legGoals?.[s as "swim"] ? <span className="leg-goal">{r.legGoals[s as "swim"]}</span> : undefined} />
          ))}
        </ListSection>
        <ListSection header="Targets for this race" headerTrailing={targets.length ? `${targets.length}` : undefined}>
          {targets.map((t) => (
            <TargetRow key={t.id} t={t} today={today} onOpen={() => setSheet({ name: "target", id: t.id })} />
          ))}
          <ListRow title={<span style={{ color: "var(--tint-ink)", fontWeight: 600 }}>Add target</span>} leading={<Symbol name="target" size={18} weight="semibold" style={{ color: "var(--tint-ink)" }} />} onClick={() => setSheet({ name: "addTarget" })} />
        </ListSection>
        {!past && (
          <ListSection header="Build-up" footer={plannedTo < taper ? "Import or plan the next blocks so the taper lands on the right weeks." : undefined}>
            <ListRow title="Race week" detail={`Week ${isoWeek(r.date)}`} />
            <ListRow title="Taper starts" detail={taperStart(r) ? dm(taper) : "No taper"} />
            <ListRow title="Plan loaded to" detail={dm(plannedTo)} trailing={plannedTo >= taper ? <Symbol name="checkmark.circle.fill" size={20} style={{ color: "var(--tint-ink)" }} /> : undefined} />
            {inCycle && <ListRow title="In cycle" subtitle={inCycle.name} detail={inCycle.focus} />}
          </ListSection>
        )}
        <ListSection>
          <Toggle label="Show in Week" checked={!!r.onCal} onChange={(v) => patch({ onCal: v ? 1 : 0 }, { onCal: v })} />
          {whoOpts && (
            <div className="status-row">
              <span>Who</span>
              <SegmentedControl size="s" label="Who races" value={r.who} onChange={(v) => patch({ who: v }, { who: v })} options={whoOpts} />
            </div>
          )}
          <div className="status-row">
            <span>Priority</span>
            <SegmentedControl
              size="s"
              label="Priority"
              value={r.priority}
              onChange={(v) => patch({ priority: v }, { priority: v })}
              options={[
                { value: "A", label: "A" },
                { value: "B", label: "B" },
                { value: "C", label: "C" },
              ]}
            />
          </div>
        </ListSection>
        {r.note && (
          <ListSection header="Note">
            <div className="note-cell">{r.note}</div>
          </ListSection>
        )}
        {!past && (
          <ButtonLink href={`/week?w=${r.date}`} variant="tinted" size="l" full icon="calendar">
            Open race week
          </ButtonLink>
        )}
        <Button
          variant="plain"
          destructive
          size="l"
          full
          icon="trash"
          onClick={() =>
            setMenu({
              y: 160,
              label: `Delete ${r.name}`,
              items: [
                {
                  label: `Delete “${r.name}”`,
                  icon: "trash",
                  destructive: true,
                  onClick: () =>
                    start(async () => {
                      const snapshot = r;
                      await deleteRace(r.id);
                      toast({
                        message: "Race deleted",
                        icon: "trash",
                        action: "Undo",
                        onAction: () =>
                          start(async () => {
                            await restoreRace(snapshot);
                            router.push(`/races/${snapshot.id}`);
                          }),
                      });
                      router.push("/races");
                    }),
                },
                { label: "Cancel", icon: "xmark" },
              ],
            })
          }
        >
          Delete race
        </Button>
      </Screen>
      {sheet?.name === "edit" && (
        <RaceSheet
          me={me}
          partner={partner}
          today={today}
          initial={r}
          onClose={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      )}
      {sheet?.name === "addTarget" && <AddTargetSheet today={today} races={races.filter((x) => x.date >= today)} autoNow={autoNow} raceId={r.id} onClose={() => setSheet(null)} />}
      {target && <TargetSheet t={target} today={today} races={races.filter((x) => x.date >= today)} onClose={() => setSheet(null)} />}
      {menu && <MenuLayer items={menu.items} y={menu.y} label={menu.label} onClose={() => setMenu(null)} />}
    </>
  );
}
