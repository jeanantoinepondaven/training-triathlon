import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLastPerformance, getWorkout, listUsers } from "@/lib/data";
import { formatDay, mondayOf, weekDates } from "@/lib/dates";
import { SPORT_LABEL, SPORT_STYLE } from "@/lib/sport";
import { formatDistance, formatDuration, formatPace } from "@/lib/units";
import { logWorkout } from "@/app/actions/workouts";
import { DeleteButton, MoveControl, StatusControls } from "@/components/workout-controls";
import { EnduranceLogForm, GymLogForm } from "@/components/log-forms";

export default async function WorkoutPage({ params, searchParams }: PageProps<"/workout/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const w = await getWorkout(id);
  if (!w) notFound();
  const mine = w.userId === me.id;
  const owner = mine ? null : (await listUsers()).find((u) => u.id === w.userId);
  const st = SPORT_STYLE[w.sport];
  const plan = w.plan;
  const log = w.log;
  const action = logWorkout.bind(null, w.id);
  const back = `/?w=${w.date}${mine ? "" : `&u=${w.userId}`}`;

  const prev = plan.kind === "gym" && mine
    ? await getLastPerformance(me.id, [...plan.exercises.map((e) => e.name), ...(log?.kind === "gym" ? log.exercises.map((e) => e.name) : [])], w.id)
    : {};

  return (
    <div className="space-y-5">
      <Link href={back} className="text-sm text-accent">‹ Week</Link>

      <div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${st.bg} ${st.text}`}>{SPORT_LABEL[w.sport]}</span>
          {w.week && <span className="text-xs text-muted">Week {w.week}</span>}
          {owner && <span className="text-xs text-muted">· {owner.name}&apos;s session</span>}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{w.title}</h1>
        <p className="text-sm text-muted">
          {formatDay(w.date, { weekday: "long", day: "numeric", month: "long" })}
          {w.date !== w.plannedDate && <> · planned for {formatDay(w.plannedDate)}</>}
        </p>
        {w.description && <p className="mt-2 whitespace-pre-line text-sm">{w.description}</p>}
      </div>

      {saved && <p className="rounded-xl bg-good/10 px-3 py-2 text-sm text-good">Saved. Nice work! 💪</p>}

      {/* The plan */}
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted">Plan</h2>
        {plan.kind === "gym" && plan.exercises.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {plan.exercises.map((e, i) => (
                <tr key={i} className="border-t border-border first:border-0">
                  <td className="py-2 pr-2 font-medium">
                    {e.name}
                    {(e.rest || e.notes) && <div className="text-xs font-normal text-muted">{[e.rest && `rest ${e.rest}`, e.notes].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{e.sets} × {e.reps}</td>
                  <td className="py-2 text-right whitespace-nowrap text-muted">{e.load}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {plan.kind === "endurance" && (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {plan.distanceM && <span><b>{formatDistance(plan.distanceM)}</b></span>}
              {plan.durationS && <span><b>{formatDuration(plan.durationS)}</b></span>}
              {plan.target && <span className="text-muted">{plan.target}</span>}
            </div>
            {plan.steps && (
              <ol className="space-y-1">
                {plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
                    <span className="font-medium">{s.repeat ? `${s.repeat} × ` : ""}{[formatDistance(s.distanceM), formatDuration(s.durationS)].filter(Boolean).join(" / ")}</span>
                    <span className="text-muted">{[s.label, s.target].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {(plan.kind === "free" || (plan.kind === "gym" && !plan.exercises.length) || (plan.kind === "endurance" && !plan.distanceM && !plan.durationS && !plan.steps)) && (
          <p className="text-sm text-muted">No detailed plan. Just log what you did.</p>
        )}
      </section>

      {mine ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">Status</h2>
            <StatusControls id={w.id} status={w.status} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">Move to another day</h2>
            <MoveControl
              id={w.id}
              date={w.date}
              plannedDate={w.plannedDate}
              weekDays={weekDates(mondayOf(w.date)).map((d) => ({ date: d, label: formatDay(d, { weekday: "narrow" }) + formatDay(d, { day: "numeric" }) }))}
            />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">{log ? "Your log" : "Log this session"}</h2>
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
        <section className="card space-y-1 p-4 text-sm">
          <h2 className="mb-1 font-semibold text-muted">Status: {w.status}</h2>
          {log?.kind === "endurance" && (
            <p>{[formatDistance(log.distanceM), formatDuration(log.durationS), formatPace(w.sport, log.distanceM, log.durationS), log.avgHr && `${log.avgHr} bpm`].filter(Boolean).join(" · ")}</p>
          )}
          {log?.kind === "gym" && log.exercises.map((e) => (
            <p key={e.name}><b>{e.name}</b>: {e.sets.map((s) => `${s.reps ?? "?"}×${s.weightKg ?? "–"}`).join(", ")}</p>
          ))}
          {w.rpe && <p>RPE {w.rpe}</p>}
          {w.notes && <p className="text-muted">“{w.notes}”</p>}
        </section>
      )}
    </div>
  );
}
