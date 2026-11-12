import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLastPerformance, getWorkout, getWorkoutsBetween, listUsers } from "@/lib/data";
import { addDays, mondayOf, today as getToday } from "@/lib/dates";
import { SessionScreen } from "@/components/session-screen";
import { intervalsStatus } from "@/lib/intervals";

export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const w = await getWorkout(id);
  if (!w) notFound();
  const mine = w.userId === me.id;
  const owner = mine ? undefined : (await listUsers()).find((u) => u.id === w.userId)?.name;
  const m = mondayOf(w.date);
  const week = await getWorkoutsBetween(w.userId, m, addDays(m, 6));
  const prev =
    w.plan.kind === "gym" && mine
      ? await getLastPerformance(me.id, [...w.plan.exercises.map((e) => e.name), ...(w.log?.kind === "gym" ? w.log.exercises.map((e) => e.name) : [])], w.id)
      : {};
  return (
    <SessionScreen
      key={w.id}
      w={w}
      readOnly={!mine}
      ownerName={owner}
      today={getToday()}
      weekItems={week.map(({ id, date, plannedDate, sport, title, status, plan, log, cycleId, intervalsEventId, intervalsActivityId }) => ({ id, date, plannedDate, sport, title, status, plan, log, cycleId, intervalsEventId, intervalsActivityId }))}
      prev={prev}
      back={`/?w=${w.date}${mine ? "" : `&u=${w.userId}`}`}
      garmin={mine ? (await intervalsStatus(me.id)).connected : false}
    />
  );
}
