import { requireUser } from "@/lib/auth";
import { getCyclesForRange, getWorkoutsBetween, listUsers } from "@/lib/data";
import { addDays, diffDays, isISODate, isoWeek, mondayOf, today as getToday, weekDates, weekRange } from "@/lib/dates";
import { focusLabel } from "@/lib/sport";
import { WeekScreen } from "@/components/week-screen";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const me = await requireUser();
  const sp = await searchParams;
  const today = getToday();
  const monday = mondayOf(isISODate(sp.w) ? sp.w : today);
  const people = await listUsers();
  const viewed = people.find((p) => p.id === sp.u) ?? people.find((p) => p.id === me.id)!;
  const [workouts, cycles] = await Promise.all([getWorkoutsBetween(viewed.id, monday, addDays(monday, 6)), getCyclesForRange(viewed.id, monday, addDays(monday, 6))]);
  const c = cycles[0];
  const cycle = c
    ? {
        name: c.name.replace(/^\d+\s*·\s*/, ""),
        week: Math.min(c.weeks, Math.floor(diffDays(monday, c.startDate) / 7) + 1),
        focus: Array.from({ length: c.weeks }, (_, i) => focusLabel(c.weekFocus?.[i + 1]) || `Week ${i + 1}`),
      }
    : null;
  const rawFocus = c?.weekFocus?.[cycle!.week] ?? "";
  const subtitle = `${weekRange(monday)}${cycle ? ` · ${cycle.focus[cycle.week - 1]} week` : ""}${/winter/i.test(rawFocus) ? " · winter" : ""}`;

  return (
    <WeekScreen
      key={`${viewed.id}-${monday}`}
      title={`Week ${isoWeek(monday)}`}
      subtitle={subtitle}
      days={weekDates(monday)}
      today={today}
      monday={monday}
      workouts={workouts.map(({ id, date, plannedDate, sport, title, status, plan, log, cycleId }) => ({ id, date, plannedDate, sport, title, status, plan, log, cycleId }))}
      editable={viewed.id === me.id}
      people={people}
      viewedId={viewed.id}
      meId={me.id}
      cycle={cycle}
    />
  );
}
