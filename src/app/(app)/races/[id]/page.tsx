import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getHealth, getAllWorkouts, getRace, listAllCycles, listRaces, listTargets, listUsers } from "@/lib/data";
import { addDays, diffDays, today as getToday } from "@/lib/dates";
import { focusLabel } from "@/lib/sport";
import { racesFor } from "@/lib/races";
import { autoNowFor, viewTargets } from "@/lib/targets";
import { RaceScreen } from "@/components/race-screens";

export default async function RacePage({ params }: PageProps<"/races/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const race = await getRace(id);
  if (!race || !racesFor([race], me.id).length) notFound();
  const today = getToday();
  const [people, races, cycles, targets, all] = await Promise.all([listUsers(), listRaces(), listAllCycles(me.id), listTargets(me.id), getAllWorkouts(me.id)]);
  const partner = people.find((p) => p.id !== me.id) ?? null;
  const health = await getHealth(me.id, addDays(today, -60));
  const lastOf = (k: "weight" | "vo2max") => [...health].reverse().find((d) => d[k] != null)?.[k] ?? null;
  const plannedTo = cycles.reduce((mx, c) => {
    const e = addDays(c.startDate, c.weeks * 7 - 1);
    return e > mx ? e : mx;
  }, today);
  const c = cycles.find((x) => race.date >= x.startDate && diffDays(race.date, x.startDate) < x.weeks * 7);
  const inCycle = c ? { name: c.name.replace(/^\d+\s*·\s*/, ""), focus: focusLabel(c.weekFocus?.[Math.floor(diffDays(race.date, c.startDate) / 7) + 1]) } : null;
  const seasonStart = cycles[0]?.startDate ?? null;
  const tv = viewTargets(targets, { workouts: all, today, seasonStart, races, health: { weight: lastOf("weight"), vo2max: lastOf("vo2max") } }).filter((t) => t.raceId === race.id);
  return (
    <RaceScreen
      key={race.id}
      race={race}
      me={{ id: me.id, name: me.name }}
      partner={partner}
      today={today}
      plannedTo={plannedTo}
      inCycle={inCycle}
      targets={tv}
      races={racesFor(races, me.id)}
      autoNow={{ ...autoNowFor(all, today, seasonStart), weight: lastOf("weight"), vo2max: lastOf("vo2max") }}
    />
  );
}
