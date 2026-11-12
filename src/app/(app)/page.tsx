import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getHealth, getAllWorkouts, getWorkoutsBetween, listAllCycles, listRaces, listTargets, listUsers } from "@/lib/data";
import { addDays, diffDays, mondayOf, today as getToday } from "@/lib/dates";
import { estimateMinutes, focusLabel } from "@/lib/sport";
import { computeProgress } from "@/lib/progress";
import { racesFor } from "@/lib/races";
import { autoNowFor, viewTargets } from "@/lib/targets";
import { HOME_COOKIE } from "@/lib/home-modules";
import { HomeScreen, type HomeSession } from "@/components/home-screen";
import type { Workout } from "@/db/schema";

const slim = (w: Workout): HomeSession => ({
  id: w.id,
  date: w.date,
  plannedDate: w.plannedDate,
  sport: w.sport,
  title: w.title,
  status: w.status,
  plan: w.plan,
  log: w.log,
  cycleId: w.cycleId,
  intervalsEventId: w.intervalsEventId,
  intervalsActivityId: w.intervalsActivityId,
  minutes: estimateMinutes(w),
});

export default async function HomePage() {
  const me = await requireUser();
  const today = getToday();
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const [people, races, all, cycles, targets, jar] = await Promise.all([listUsers(), listRaces(), getAllWorkouts(me.id), listAllCycles(me.id), listTargets(me.id), cookies()]);
  const partner = people.find((p) => p.id !== me.id) ?? null;
  const [partnerWeek, health] = await Promise.all([partner ? getWorkoutsBetween(partner.id, monday, sunday) : Promise.resolve([]), getHealth(me.id, addDays(today, -60))]);
  const lastOf = (k: "weight" | "vo2max") => [...health].reverse().find((d) => d[k] != null)?.[k] ?? null;

  const hidden = (jar.get(HOME_COOKIE)?.value ?? "").split(",").filter(Boolean);
  const visible = racesFor(races, me.id);

  // Cycles → per-week focus for the season calendar.
  const season = cycles.map((c) => ({
    name: c.name.replace(/^\d+\s*·\s*/, ""),
    start: c.startDate,
    focus: Array.from({ length: c.weeks }, (_, i) => focusLabel(c.weekFocus?.[i + 1]) || `Week ${i + 1}`),
  }));
  const seasonStart = cycles[0]?.startDate ?? null;
  const cur = season.find((c) => today >= c.start && diffDays(today, c.start) < c.focus.length * 7);
  const curFocus = cur ? cur.focus[Math.floor(diffDays(today, cur.start) / 7)] : null;

  // Training load: hours done in the last 7 weeks, then this week (planned / done).
  const minsOf = (w: Workout) => (w.log?.kind === "endurance" && w.log.durationS ? Math.round(w.log.durationS / 60) : estimateMinutes(w));
  const load = Array.from({ length: 7 }, (_, i) => {
    const m = addDays(monday, -7 * (7 - i));
    const e = addDays(m, 6);
    const mins = all.filter((w) => w.status === "done" && w.date >= m && w.date <= e).reduce((x, w) => x + minsOf(w), 0);
    return { week: m, hours: Math.round((mins / 60) * 10) / 10 };
  });

  // Highlight: the freshest personal best from the last three weeks.
  const prog = computeProgress(all, today);
  const recent = addDays(today, -21);
  let highlight: { title: string; sub: string } | null = null;
  const lift = prog.exercises
    .map((e) => ({ e, top: e.points.reduce((a, b) => (b.e1rm >= a.e1rm ? b : a)) }))
    .filter((x) => x.e.points.length > 1 && x.top.date >= recent && x.e.best > x.e.first)
    .sort((a, b) => b.top.date.localeCompare(a.top.date))[0];
  if (lift) highlight = { title: `New best: ${lift.e.name.toLowerCase()} ${lift.top.topKg} kg`, sub: `Est. 1RM ${Math.round(lift.e.best)} kg, up ${Math.round(lift.e.best - lift.e.first)} kg since the first log.` };
  else {
    const rec = prog.records.filter((r) => r.date >= recent).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (rec) highlight = { title: `${rec.label}: ${rec.value}`, sub: "A personal record from the last three weeks." };
  }

  const autoNow = { ...autoNowFor(all, today, seasonStart), weight: lastOf("weight"), vo2max: lastOf("vo2max") };

  return (
    <HomeScreen
      me={{ id: me.id, name: me.name }}
      partner={partner}
      today={today}
      hidden={hidden}
      races={visible}
      targets={viewTargets(targets, { workouts: all, today, seasonStart, races, health: { weight: lastOf("weight"), vo2max: lastOf("vo2max") } })}
      week={all.filter((w) => w.date >= monday && w.date <= sunday).map(slim)}
      partnerWeek={partnerWeek.map(slim)}
      season={season}
      curFocus={curFocus}
      load={load}
      highlight={highlight}
      autoNow={autoNow}
      health={health}
    />
  );
}
