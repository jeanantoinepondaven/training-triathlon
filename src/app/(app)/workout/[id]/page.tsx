import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLastPerformance, getWorkout, listUsers } from "@/lib/data";
import { formatDay, mondayOf, today as getToday, weekDates } from "@/lib/dates";
import { heroStat, loggedLine, stepsFor } from "@/lib/sport";
import { formatDistance, formatDuration, formatPace } from "@/lib/units";
import { logWorkout } from "@/app/actions/workouts";
import { SportTag } from "@/components/tandem/icon";
import { IconLink, Notice, SectionLabel, StatusTag } from "@/components/tandem/ui";
import { DeleteButton, MoveControl, StatusControl } from "@/components/workout-controls";
import { EnduranceLogForm, GymLogForm } from "@/components/log-forms";
import Link from "next/link";

export default async function WorkoutPage({ params, searchParams }: PageProps<"/workout/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const w = await getWorkout(id);
  if (!w) notFound();
  const mine = w.userId === me.id;
  const owner = mine ? null : (await listUsers()).find((u) => u.id === w.userId);
  const plan = w.plan;
  const log = w.log;
  const today = getToday();
  const action = logWorkout.bind(null, w.id);
  const back = `/?w=${w.date}${mine ? "" : `&u=${w.userId}`}`;
  const stat = heroStat(w);
  const steps = stepsFor(w);

  const prev =
    plan.kind === "gym" && mine
      ? await getLastPerformance(me.id, [...plan.exercises.map((e) => e.name), ...(log?.kind === "gym" ? log.exercises.map((e) => e.name) : [])], w.id)
      : {};

  return (
    <>
      <div className="-ml-3 flex items-center gap-1">
        <IconLink href={back} icon="left" label="Back to the week" />
        <span className="td-label td-muted">Week</span>
      </div>

      {!mine && owner && (
        <Notice tone="partner" title={`${owner.name}'s session`} action={<Link href="/" className="td-btn td-btn-secondary td-btn-sm">Back to me</Link>}>
          Read only.
        </Notice>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SportTag sport={w.sport} />
          {w.week && <span className="td-label td-muted">Week {w.week}</span>}
          {w.date === today && <StatusTag kind="today">Today</StatusTag>}
          {w.date !== w.plannedDate && <StatusTag kind="moved">Moved from {formatDay(w.plannedDate, { weekday: "short" })}</StatusTag>}
          {w.status === "planned" && w.date < today && <StatusTag kind="missed">Missed</StatusTag>}
        </div>
        <h1 className="t-display-l m-0">{w.title}</h1>
        <p className="td-metric-s td-muted m-0">{formatDay(w.date, { weekday: "long", day: "numeric", month: "long" })}</p>
        {w.description && <p className="m-0 whitespace-pre-line">{w.description}</p>}
      </header>

      {saved && <Notice tone="done" title="Saved.">{loggedLine(w) || "Logged and marked done."}</Notice>}

      <section className={`td-tile td-s-${w.sport}`} style={{ padding: 20, gap: 12 }} aria-label="Plan">
        <span className="td-label td-muted">Plan</span>
        {plan.kind === "endurance" && (stat || plan.target) && (
          <div>
            {stat && (
              <div className="td-hero-stat" style={{ marginTop: 0 }}>
                <b>{stat.value}</b>
                <span className="td-metric td-muted">{stat.unit}</span>
              </div>
            )}
            {plan.target && <div className="td-metric td-muted">{plan.target}</div>}
          </div>
        )}
        {steps.length > 0 && (
          <ol className="td-steps td-metric" style={{ marginTop: 0 }}>
            {steps.map((s, i) => (
              <li key={i} className={s.easy ? "td-easy" : undefined}>
                <span>{plan.kind === "gym" ? s.note : s.text}</span>
                <span className="td-muted">{plan.kind === "gym" ? s.text : s.note}</span>
              </li>
            ))}
          </ol>
        )}
        {plan.kind === "gym" && plan.exercises.some((e) => e.rest || e.notes) && (
          <p className="td-metric-s td-muted m-0">
            {plan.exercises.filter((e) => e.rest || e.notes).map((e) => `${e.name}: ${[e.rest && `rest ${e.rest}`, e.notes].filter(Boolean).join(", ")}`).join(" · ")}
          </p>
        )}
        {!stat && !steps.length && !(plan.kind === "endurance" && plan.target) && <p className="m-0 td-muted">No detailed plan. Log what you did.</p>}
      </section>

      {mine ? (
        <>
          <section className="flex flex-col gap-2">
            <SectionLabel>Status</SectionLabel>
            <StatusControl id={w.id} status={w.status} />
          </section>
          {w.status !== "done" && (
            <section className="flex flex-col gap-2">
              <SectionLabel>Move to</SectionLabel>
              <MoveControl
                id={w.id}
                date={w.date}
                plannedDate={w.plannedDate}
                weekDays={weekDates(mondayOf(w.date)).map((d) => ({ date: d, label: formatDay(d, { weekday: "short" }) }))}
              />
            </section>
          )}
          <section className="flex flex-col gap-3">
            <SectionLabel>{log ? "Your log" : "Log it"}</SectionLabel>
            {plan.kind === "gym" ? (
              <GymLogForm action={action} plan={plan} log={log?.kind === "gym" ? log : null} prev={prev} rpe={w.rpe} feeling={w.feeling} notes={w.notes} />
            ) : (
              <EnduranceLogForm
                action={action}
                sport={w.sport}
                hasLog={!!log}
                rpe={w.rpe}
                feeling={w.feeling}
                notes={w.notes}
                initial={
                  log?.kind === "endurance"
                    ? {
                        distance: log.distanceM ? String(w.sport === "swim" ? log.distanceM : log.distanceM / 1000) : undefined,
                        duration: log.durationS ? formatDuration(log.durationS).replace(" min", "min") : undefined,
                        avgHr: log.avgHr,
                        avgPower: log.avgPower,
                        elevation: log.elevationM,
                      }
                    : {}
                }
              />
            )}
          </section>
          {!w.cycleId && <DeleteButton id={w.id} />}
        </>
      ) : (
        <section className="td-tile" style={{ padding: 16 }}>
          <span className="td-label td-muted">Status</span>
          <span className="t-title">{w.status === "done" ? "Done" : w.status === "skipped" ? "Skipped" : w.date < today ? "Missed" : "Planned"}</span>
          {log?.kind === "endurance" && (
            <span className="td-metric">{[formatDistance(log.distanceM), formatDuration(log.durationS), formatPace(w.sport, log.distanceM, log.durationS), log.avgHr && `${log.avgHr} bpm`].filter(Boolean).join(" · ")}</span>
          )}
          {log?.kind === "gym" &&
            log.exercises.map((e) => (
              <span key={e.name} className="td-metric">
                {e.name}: {e.sets.map((s) => `${s.reps ?? "?"} × ${s.weightKg ?? "–"}`).join(", ")}
              </span>
            ))}
          {w.rpe && <span className="td-metric-s td-muted">RPE {w.rpe}/10</span>}
          {w.notes && <span className="td-muted">“{w.notes}”</span>}
        </section>
      )}
    </>
  );
}
