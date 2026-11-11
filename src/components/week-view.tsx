"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveWorkout, setStatus } from "@/app/actions/workouts";
import type { Workout } from "@/db/schema";
import { DayStrip, SessionCard, type CardStatus, type Day } from "@/components/tandem/interactive";
import { ButtonLink, Notice, SectionLabel, StatusTag } from "@/components/tandem/ui";
import { estimateMinutes, heroStat, loggedLine, slotFor, stepsFor, targetLine } from "@/lib/sport";
import { formatDay } from "@/lib/dates";

export type WeekWorkout = Pick<Workout, "id" | "date" | "plannedDate" | "sport" | "title" | "status" | "plan" | "log">;
type Change = { id: string; date?: string; status?: Workout["status"] };

export function WeekView({
  days,
  today,
  workouts,
  editable,
  ownerQuery,
}: {
  days: string[];
  today: string;
  workouts: WeekWorkout[];
  editable: boolean;
  ownerQuery: string;
}) {
  const [moving, setMoving] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | undefined>(() => {
    const i = days.indexOf(today);
    return i >= 0 ? i : undefined;
  });
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(workouts, (cur, c: Change) =>
    cur.map((w) => (w.id === c.id ? { ...w, ...(c.date && { date: c.date }), ...(c.status && { status: c.status }) } : w)),
  );

  const statusOf = (w: WeekWorkout): CardStatus =>
    w.status === "done" ? "done" : w.status === "skipped" ? "skipped" : w.date < today ? "missed" : "planned";
  const movedFrom = (w: WeekWorkout) => (w.date !== w.plannedDate ? formatDay(w.plannedDate, { weekday: "short" }) : undefined);

  const toggle = (w: WeekWorkout, done: boolean) =>
    start(async () => {
      apply({ id: w.id, status: done ? "done" : "planned" });
      await setStatus(w.id, done ? "done" : "planned");
    });
  const moveTo = (date: string) => {
    const id = moving;
    setMoving(null);
    if (!id) return;
    start(async () => {
      apply({ id, date });
      await moveWorkout(id, date);
    });
  };

  const stripDays: Day[] = days.map((d) => ({
    name: formatDay(d, { weekday: "short" }),
    date: Number(d.slice(8)),
    today: d === today,
    load: items.filter((w) => w.date === d && w.status !== "skipped").map((w) => ({ sport: w.sport, min: estimateMinutes(w), done: w.status === "done" })),
  }));
  const maxMin = Math.max(90, ...stripDays.map((d) => d.load.reduce((a, b) => a + b.min, 0)));
  const movingCard = items.find((w) => w.id === moving);

  const card = (w: WeekWorkout, hero = false) => (
    <SessionCard
      key={w.id}
      href={`/workout/${w.id}`}
      sport={w.sport}
      title={w.title}
      target={targetLine(w)}
      status={statusOf(w)}
      movedFrom={movedFrom(w)}
      logged={loggedLine(w)}
      readOnly={!editable}
      onToggle={(done) => toggle(w, done)}
      onMove={editable ? () => setMoving(moving === w.id ? null : w.id) : undefined}
      lifted={moving === w.id}
      hero={hero}
      slot={hero ? slotFor(w) : undefined}
      stat={hero ? heroStat(w) : undefined}
      steps={hero ? stepsFor(w) : undefined}
    />
  );

  const counted = items.filter((w) => w.status !== "skipped");
  const doneCount = counted.filter((w) => w.status === "done").length;
  const weekDone = editable && counted.length > 0 && doneCount === counted.length;
  const isThisWeek = days.includes(today);
  const todays = items.filter((w) => w.date === today);
  const otherDays = isThisWeek ? days.filter((d) => d !== today) : days;
  const nextUp = items.find((w) => w.date > today && w.status === "planned");

  return (
    <div className="flex flex-col gap-6">
      {weekDone && (
        <Notice tone="done" title={`Week done. ${doneCount} of ${counted.length}.`}>
          Every session ticked. Enjoy the rest.
        </Notice>
      )}

      <div
        className="flex flex-col gap-2"
        style={moving ? { position: "sticky", top: 8, zIndex: 10, background: "var(--bg)", paddingBottom: 8, boxShadow: "0 8px 12px -12px rgba(0,0,0,.3)" } : undefined}
      >
        <DayStrip
          days={stripDays}
          max={maxMin}
          selected={selected}
          mode={moving ? "drop" : "view"}
          origin={movingCard ? days.indexOf(movingCard.date) : undefined}
          hint={movingCard ? `Move “${movingCard.title}” to…` : undefined}
          onCancel={() => setMoving(null)}
          onSelect={(i) => {
            if (moving) {
              if (movingCard && days[i] !== movingCard.date) moveTo(days[i]);
              return;
            }
            setSelected(i);
            document.getElementById(`day-${days[i]}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>

      {isThisWeek && (
        <section id={`day-${today}`} className="flex scroll-mt-4 flex-col gap-3" aria-label="Today">
          <div className="flex items-center gap-2">
            <StatusTag kind="today">Today</StatusTag>
            <span className="td-label td-muted">{formatDay(today, { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>
          {todays.length ? (
            todays.map((w, i) => card(w, i === 0))
          ) : (
            <div className="td-card td-s-other" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <p className="t-display-m" style={{ margin: 0 }}>Rest day</p>
                <p className="t-small td-muted" style={{ margin: "4px 0 0" }}>
                  {nextUp ? `Next: ${formatDay(nextUp.date, { weekday: "short" })} · ${nextUp.title}` : "Nothing else planned this week."}
                </p>
              </div>
            </div>
          )}
          {editable && (
            <Link href={`/add?date=${today}`} className="td-btn td-btn-ghost td-btn-sm self-start">
              + Add session
            </Link>
          )}
        </section>
      )}

      <section className="flex flex-col gap-5" aria-label={isThisWeek ? "Rest of the week" : "This week"}>
        {otherDays.map((d) => {
          const list = items.filter((w) => w.date === d);
          return (
            <div key={d} id={`day-${d}`} className="flex scroll-mt-4 flex-col gap-3">
              <SectionLabel
                right={
                  editable && !moving ? (
                    <Link href={`/add?date=${d}`} className="td-btn td-btn-ghost td-btn-sm" aria-label={`Add a session on ${formatDay(d, { weekday: "long" })}`}>
                      + Add
                    </Link>
                  ) : undefined
                }
              >
                {formatDay(d, { weekday: "short", day: "numeric" })}
              </SectionLabel>
              {list.length ? list.map((w) => card(w)) : <p className="t-small m-0" style={{ color: "var(--ink-faint)" }}>Rest</p>}
            </div>
          );
        })}
      </section>

      {items.length === 0 && editable && (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-ink-muted">Nothing planned this week.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/add?date=${isThisWeek ? today : days[0]}${ownerQuery}`} variant="secondary" icon="plus">
              Add session
            </ButtonLink>
            <ButtonLink href="/cycles/new" variant="lane">
              Import next cycle
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
