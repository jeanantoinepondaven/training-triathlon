import { requireUser } from "@/lib/auth";
import { getAllWorkouts, getCyclesForRange, listUsers } from "@/lib/data";
import { computeProgress } from "@/lib/progress";
import { addDays, diffDays, formatDay, isoWeek, mondayOf, today as getToday } from "@/lib/dates";
import { estimateMinutes } from "@/lib/sport";
import { ProgressScreen } from "@/components/progress-screen";

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const me = await requireUser();
  const { u } = await searchParams;
  const people = await listUsers();
  const viewed = people.find((p) => p.id === u) ?? people.find((p) => p.id === me.id)!;
  const t = getToday();
  const all = await getAllWorkouts(viewed.id);
  const p = computeProgress(all, t);
  const cyc = (await getCyclesForRange(viewed.id, t, t))[0];
  const cycEnd = cyc ? addDays(cyc.startDate, cyc.weeks * 7 - 1) : "";
  const inBlock = cyc ? all.filter((w) => w.date >= cyc.startDate && w.date <= cycEnd && w.date <= t && w.status !== "skipped") : [];

  // Volume for the last 4 weeks, minutes and km per sport (done sessions).
  const thisMon = mondayOf(t);
  const vol = [3, 2, 1, 0].map((k) => {
    const m = addDays(thisMon, -7 * k);
    const ws = all.filter((w) => w.status === "done" && w.date >= m && w.date <= addDays(m, 6));
    const zero = { swim: 0, bike: 0, run: 0 };
    const tt = { ...zero };
    const dd = { ...zero };
    for (const w of ws) {
      if (w.sport !== "swim" && w.sport !== "bike" && w.sport !== "run") continue;
      tt[w.sport] += w.log?.kind === "endurance" && w.log.durationS ? w.log.durationS / 60 : estimateMinutes(w);
      const dist = w.log?.kind === "endurance" ? w.log.distanceM : w.plan.kind === "endurance" ? w.plan.distanceM : 0;
      dd[w.sport] += (dist ?? 0) / 1000;
    }
    return { label: `Wk ${isoWeek(m)}`, t: tt, d: dd };
  });

  const records = p.records.map((r) => ({ sport: r.sport, title: r.label.replace(/^(\w+) (\w+)$/, (_, a: string, b: string) => `${a} ${b}`), sub: formatDay(r.date, { day: "numeric", month: "short" }), detail: r.value }));
  const lifts = p.exercises.slice(0, 6).map((e) => ({ name: e.name, points: e.points.map((x) => x.e1rm) }));
  for (const e of p.exercises.slice(0, 3)) records.push({ sport: "gym", title: e.name, sub: "Est. 1RM", detail: `${e.best} kg` });

  return (
    <ProgressScreen
      data={{
        people,
        viewedId: viewed.id,
        meId: me.id,
        cycleName: cyc ? `${cyc.name.replace(/^\d+\s*·\s*/, "")} · week ${Math.floor(diffDays(t, cyc.startDate) / 7) + 1} of ${cyc.weeks}` : "",
        cons: p.adherence.map((a) => ({ week: formatDay(a.week, { day: "numeric", month: "short" }), pct: a.planned ? a.done / a.planned : 0 })),
        block: { done: inBlock.filter((w) => w.status === "done").length, due: inBlock.length },
        vol,
        lifts,
        records,
        sessionsDone: p.totals.sessions,
      }}
    />
  );
}
