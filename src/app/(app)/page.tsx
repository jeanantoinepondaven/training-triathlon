import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCyclesForRange, getWorkoutsBetween, listUsers } from "@/lib/data";
import { addDays, diffDays, formatDay, isISODate, mondayOf, today as getToday, weekDates } from "@/lib/dates";
import { WeekBoard } from "@/components/week-board";
import { SPORT_LABEL, SPORT_STYLE } from "@/lib/sport";
import { formatDistance, formatDuration } from "@/lib/units";
import type { Sport } from "@/db/schema";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const me = await requireUser();
  const sp = await searchParams;
  const today = getToday();
  const monday = mondayOf(isISODate(sp.w) ? sp.w : today);
  const sunday = addDays(monday, 6);
  const people = await listUsers();
  const viewed = people.find((p) => p.id === sp.u) ?? people.find((p) => p.id === me.id)!;
  const editable = viewed.id === me.id;

  const [workouts, cycles] = await Promise.all([
    getWorkoutsBetween(viewed.id, monday, sunday),
    getCyclesForRange(viewed.id, monday, sunday),
  ]);

  const done = workouts.filter((w) => w.status === "done").length;
  const bySport = new Map<Sport, { n: number; dist: number; time: number }>();
  for (const w of workouts) {
    if (w.status === "skipped") continue;
    const s = bySport.get(w.sport) ?? { n: 0, dist: 0, time: 0 };
    s.n++;
    const src = w.status === "done" && w.log?.kind === "endurance" ? w.log : w.plan.kind === "endurance" ? w.plan : null;
    s.dist += src?.distanceM ?? 0;
    s.time += src?.durationS ?? 0;
    bySport.set(w.sport, s);
  }

  const q = (w: string) => `/?w=${w}${editable ? "" : `&u=${viewed.id}`}`;

  return (
    <div className="space-y-4">
      {people.length > 1 && (
        <div className="flex rounded-xl bg-surface-2 p-1 text-sm">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/?w=${monday}${p.id === me.id ? "" : `&u=${p.id}`}`}
              className={`flex-1 rounded-lg py-1.5 text-center font-medium ${p.id === viewed.id ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {p.id === me.id ? "Me" : p.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={q(addDays(monday, -7))} className="btn-ghost px-3" aria-label="Previous week">‹</Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {formatDay(monday, { day: "numeric", month: "short" })} – {formatDay(sunday, { day: "numeric", month: "short" })}
          </h1>
          {monday !== mondayOf(today) && (
            <Link href={q(today)} className="text-xs text-accent">Back to this week</Link>
          )}
        </div>
        <Link href={q(addDays(monday, 7))} className="btn-ghost px-3" aria-label="Next week">›</Link>
      </div>

      {cycles.map((c) => {
        const week = Math.floor(diffDays(monday, c.startDate) / 7) + 1;
        const focus = c.weekFocus?.[week];
        return (
          <div key={c.id} className="card px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{c.name}</p>
              <p className="shrink-0 text-sm text-muted">Week {Math.max(1, Math.min(week, c.weeks))} of {c.weeks}</p>
            </div>
            {(focus || c.goal) && <p className="text-sm text-muted">{focus ? `Focus: ${focus}` : c.goal}</p>}
            <div className="mt-2 flex gap-1">
              {Array.from({ length: c.weeks }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i + 1 < week ? "bg-accent/50" : i + 1 === week ? "bg-accent" : "bg-surface-2"}`} />
              ))}
            </div>
          </div>
        );
      })}

      {workouts.length > 0 && (
        <div className="card flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="font-medium">{done}/{workouts.length} done</span>
          {[...bySport.entries()].map(([sport, s]) => (
            <span key={sport} className="flex items-center gap-1.5 text-muted">
              <span className={`size-2 rounded-full ${SPORT_STYLE[sport].dot}`} />
              {SPORT_LABEL[sport]} {s.dist ? formatDistance(s.dist) : s.time ? formatDuration(s.time) : `×${s.n}`}
            </span>
          ))}
        </div>
      )}

      <WeekBoard days={weekDates(monday)} today={today} workouts={workouts} editable={editable} />

      {workouts.length === 0 && cycles.length === 0 && editable && (
        <div className="card p-5 text-center">
          <p className="font-medium">Nothing planned this week</p>
          <p className="mb-3 text-sm text-muted">Import a 3-week cycle to fill your calendar.</p>
          <Link href="/cycles/new" className="btn-primary">Import a cycle</Link>
        </div>
      )}
    </div>
  );
}
