"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveWorkout, setStatus } from "@/app/actions/workouts";
import type { Workout } from "@/db/schema";
import { SPORT_LABEL, SPORT_STYLE, logSummary, planSummary } from "@/lib/sport";
import { formatDay } from "@/lib/dates";

type Card = Pick<Workout, "id" | "date" | "plannedDate" | "sport" | "title" | "status" | "plan" | "log">;
type Change = { id: string; date?: string; status?: Workout["status"] };

export function WeekBoard({
  days,
  today,
  workouts,
  editable,
}: {
  days: string[];
  today: string;
  workouts: Card[];
  editable: boolean;
}) {
  const [moving, setMoving] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(workouts, (cur, c: Change) =>
    cur.map((w) => (w.id === c.id ? { ...w, ...(c.date && { date: c.date }), ...(c.status && { status: c.status }) } : w)),
  );

  const move = (id: string, date: string) => {
    setMoving(null);
    setDragging(null);
    start(async () => {
      apply({ id, date });
      await moveWorkout(id, date);
    });
  };
  const toggleDone = (w: Card) =>
    start(async () => {
      const status = w.status === "done" ? "planned" : "done";
      apply({ id: w.id, status });
      await setStatus(w.id, status);
    });

  const movingCard = items.find((w) => w.id === moving);

  return (
    <div className="space-y-2">
      {movingCard && (
        <div className="sticky top-14 z-10 flex items-center justify-between rounded-xl bg-accent px-3 py-2 text-sm text-white shadow">
          <span>Moving <b>{movingCard.title}</b>: tap a day</span>
          <button className="rounded-lg bg-white/20 px-2 py-0.5" onClick={() => setMoving(null)}>Cancel</button>
        </div>
      )}
      {days.map((d) => {
        const list = items.filter((w) => w.date === d);
        const isToday = d === today;
        const target = (moving && movingCard?.date !== d) || (dragging && items.find((w) => w.id === dragging)?.date !== d);
        return (
          <section
            key={d}
            onClick={() => moving && movingCard?.date !== d && move(moving, d)}
            onDragOver={(e) => editable && dragging && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) move(dragging, d);
            }}
            className={`rounded-2xl p-2 transition ${isToday ? "bg-accent/5 ring-1 ring-accent/40" : ""} ${
              target ? "cursor-pointer outline-2 outline-dashed outline-accent/50" : ""
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <h3 className={`text-sm font-semibold ${isToday ? "text-accent" : d < today ? "text-muted" : ""}`}>
                {formatDay(d, { weekday: "long" })}{" "}
                <span className="font-normal text-muted">{formatDay(d, { day: "numeric", month: "short" })}</span>
                {isToday && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-white">Today</span>}
              </h3>
              {editable && !moving && (
                <Link href={`/add?date=${d}`} className="rounded-lg px-2 text-lg leading-none text-muted hover:bg-surface-2" aria-label="Add session">
                  +
                </Link>
              )}
            </div>
            {list.length === 0 ? (
              <p className="px-1 pb-1 text-sm text-muted/70">Rest</p>
            ) : (
              <ul className="space-y-2">
                {list.map((w) => {
                  const st = SPORT_STYLE[w.sport];
                  const moved = w.date !== w.plannedDate;
                  return (
                    <li
                      key={w.id}
                      draggable={editable}
                      onDragStart={() => setDragging(w.id)}
                      onDragEnd={() => setDragging(null)}
                      className={`card flex items-stretch overflow-hidden border-l-4 ${st.border} ${
                        w.status === "skipped" ? "opacity-50" : ""
                      } ${moving === w.id ? "ring-2 ring-accent" : ""}`}
                    >
                      {editable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDone(w);
                          }}
                          className="flex w-11 shrink-0 items-center justify-center"
                          aria-label={w.status === "done" ? "Mark as not done" : "Mark as done"}
                        >
                          <span
                            className={`flex size-6 items-center justify-center rounded-full border-2 ${
                              w.status === "done" ? "border-good bg-good text-white" : "border-border"
                            }`}
                          >
                            {w.status === "done" && (
                              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            )}
                          </span>
                        </button>
                      )}
                      <Link
                        href={`/workout/${w.id}`}
                        onClick={(e) => moving && e.preventDefault()}
                        className={`min-w-0 flex-1 py-2.5 ${editable ? "" : "pl-3"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-wide ${st.text}`}>{SPORT_LABEL[w.sport]}</span>
                          {moved && <span className="text-[11px] text-muted">moved from {formatDay(w.plannedDate, { weekday: "short" })}</span>}
                          {w.status === "skipped" && <span className="text-[11px] text-bad">skipped</span>}
                        </div>
                        <p className={`truncate font-medium ${w.status === "done" ? "text-muted line-through decoration-1" : ""}`}>{w.title}</p>
                        <p className="truncate text-sm text-muted">{w.status === "done" && w.log ? `✓ ${logSummary(w)}` : planSummary(w)}</p>
                      </Link>
                      {editable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoving(moving === w.id ? null : w.id);
                          }}
                          className="flex w-11 shrink-0 items-center justify-center text-muted hover:text-text"
                          aria-label="Move to another day"
                          title="Move to another day"
                        >
                          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                            <path d="M8 7l-4 4 4 4M16 7l4 4-4 4M4 11h16" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
