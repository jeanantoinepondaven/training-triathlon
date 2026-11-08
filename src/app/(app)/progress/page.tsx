import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAllWorkouts, listUsers } from "@/lib/data";
import { computeProgress } from "@/lib/progress";
import { formatDay, today } from "@/lib/dates";
import { StrengthChart, VolumeChart } from "@/components/charts";
import { SPORT_STYLE } from "@/lib/sport";

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const me = await requireUser();
  const { u } = await searchParams;
  const people = await listUsers();
  const viewed = people.find((p) => p.id === u) ?? people.find((p) => p.id === me.id)!;
  const t = today();
  const p = computeProgress(await getAllWorkouts(viewed.id), t);
  const last4 = p.adherence.slice(-4);
  const planned4 = last4.reduce((a, w) => a + w.planned, 0);
  const done4 = last4.reduce((a, w) => a + w.done, 0);

  return (
    <div className="space-y-5">
      {people.length > 1 && (
        <div className="flex rounded-xl bg-surface-2 p-1 text-sm">
          {people.map((x) => (
            <Link key={x.id} href={x.id === me.id ? "/progress" : `/progress?u=${x.id}`}
              className={`flex-1 rounded-lg py-1.5 text-center font-medium ${x.id === viewed.id ? "bg-surface shadow-sm" : "text-muted"}`}>
              {x.id === me.id ? "Me" : x.name}
            </Link>
          ))}
        </div>
      )}
      <h1 className="text-2xl font-semibold">Progress</h1>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3"><p className="text-xs text-muted">Sessions done</p><p className="text-2xl font-semibold tabular-nums">{p.totals.sessions}</p></div>
        <div className="card p-3"><p className="text-xs text-muted">Last 4 weeks</p><p className="text-2xl font-semibold tabular-nums">{planned4 ? Math.round((done4 / planned4) * 100) : 0}%</p><p className="text-xs text-muted">{done4}/{planned4} done</p></div>
        <div className="card p-3"><p className="text-xs text-muted">All time</p><p className="text-2xl font-semibold tabular-nums">{p.totals.planned ? Math.round((p.totals.sessions / p.totals.planned) * 100) : 0}%</p><p className="text-xs text-muted">adherence</p></div>
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Consistency</h2>
        <div className="flex items-end gap-1">
          {p.adherence.map((w) => {
            const pct = w.planned ? w.done / w.planned : 0;
            return (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1" title={`Week of ${formatDay(w.week)}: ${w.done}/${w.planned}`}>
                <div className="relative h-16 w-full overflow-hidden rounded-md bg-surface-2">
                  <div className="absolute inset-x-0 bottom-0 rounded-md bg-good" style={{ height: `${pct * 100}%` }} />
                </div>
                <span className="text-[9px] text-muted">{formatDay(w.week, { day: "numeric", month: "numeric" })}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">Share of planned sessions completed each week (last 12 weeks).</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Weekly volume</h2>
        <VolumeChart distance={p.distance} time={p.time} />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Strength</h2>
        <StrengthChart exercises={p.exercises.map(({ key, name, points, best, change }) => ({ key, name, points, best, change }))} />
      </section>

      {p.records.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Records</h2>
          <ul className="divide-y divide-border text-sm">
            {p.records.map((r) => (
              <li key={r.label} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${SPORT_STYLE[r.sport].dot}`} />{r.label}</span>
                <span><b className="tabular-nums">{r.value}</b> <span className="text-xs text-muted">{formatDay(r.date)}</span></span>
              </li>
            ))}
            {p.exercises.slice(0, 6).map((e) => (
              <li key={e.key} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${SPORT_STYLE.gym.dot}`} />{e.name} (e1RM)</span>
                <b className="tabular-nums">{e.best} kg</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
