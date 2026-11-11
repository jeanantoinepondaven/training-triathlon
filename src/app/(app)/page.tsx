import { requireUser } from "@/lib/auth";
import { getCycleWeekStats, getCyclesForRange, getWorkoutsBetween, listUsers } from "@/lib/data";
import { addDays, diffDays, formatDay, isISODate, mondayOf, today as getToday, weekDates } from "@/lib/dates";
import { WeekView } from "@/components/week-view";
import { CycleBanner, IconLink, Notice, SegmentedLinks } from "@/components/tandem/ui";
import Link from "next/link";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const me = await requireUser();
  const sp = await searchParams;
  const today = getToday();
  const monday = mondayOf(isISODate(sp.w) ? sp.w : today);
  const sunday = addDays(monday, 6);
  const people = await listUsers();
  const viewed = people.find((p) => p.id === sp.u) ?? people.find((p) => p.id === me.id)!;
  const editable = viewed.id === me.id;
  const ownerQuery = editable ? "" : `&u=${viewed.id}`;

  const [workouts, cycles] = await Promise.all([getWorkoutsBetween(viewed.id, monday, sunday), getCyclesForRange(viewed.id, monday, sunday)]);
  const stats = await getCycleWeekStats(cycles.map((c) => c.id));
  const isThisWeek = monday === mondayOf(today);
  const q = (w: string) => `/?w=${w}${ownerQuery}`;

  return (
    <>
      {people.length > 1 && (
        <SegmentedLinks
          label="Whose plan"
          block
          value={viewed.id}
          options={people.map((p) => ({ value: p.id, label: p.id === me.id ? "Me" : p.name, href: `/?w=${monday}${p.id === me.id ? "" : `&u=${p.id}`}` }))}
        />
      )}

      {!editable && (
        <Notice tone="partner" title={`${viewed.name}'s week`} action={<Link href={`/?w=${monday}`} className="td-btn td-btn-secondary td-btn-sm">Back to me</Link>}>
          Read only. You can look, not change.
        </Notice>
      )}

      <div className="flex items-center justify-between gap-2">
        <IconLink href={q(addDays(monday, -7))} icon="left" label="Previous week" />
        <div className="text-center">
          <h1 className="t-display-m m-0">{isThisWeek ? "This week" : `Week of ${formatDay(monday, { day: "numeric", month: "short" })}`}</h1>
          {isThisWeek ? (
            <p className="td-metric-s td-muted m-0">{formatDay(monday, { day: "numeric", month: "short" })} – {formatDay(sunday, { day: "numeric", month: "short" })}</p>
          ) : (
            <Link href={q(today)} className="td-metric-s" style={{ color: "var(--ink)" }}>Back to this week</Link>
          )}
        </div>
        <IconLink href={q(addDays(monday, 7))} icon="right" label="Next week" />
      </div>

      <WeekView key={`${viewed.id}-${monday}`} days={weekDates(monday)} today={today} workouts={workouts} editable={editable} ownerQuery={ownerQuery} />

      {cycles.map((c) => {
        const current = Math.min(c.weeks, Math.max(1, Math.floor(diffDays(monday, c.startDate) / 7) + 1));
        const s = stats[c.id] ?? {};
        return (
          <CycleBanner
            key={c.id}
            href="/cycles"
            goal={c.goal}
            name={c.name}
            current={current}
            weeks={Array.from({ length: c.weeks }, (_, i) => ({
              focus: c.weekFocus?.[i + 1] ?? `Week ${i + 1}`,
              done: s[i + 1]?.total ? s[i + 1].done / s[i + 1].total : 0,
            }))}
          />
        );
      })}
    </>
  );
}
