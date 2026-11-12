import { requireUser } from "@/lib/auth";
import { getCycleWeekStats, listCycles } from "@/lib/data";
import { addDays, diffDays, formatDay, today as getToday } from "@/lib/dates";
import { focusLabel } from "@/lib/sport";
import { CyclesScreen, type CycleItem } from "@/components/cycles-screen";
import { intervalsStatus } from "@/lib/intervals";

export default async function CyclesPage() {
  const me = await requireUser();
  const cycles = await listCycles(me.id);
  const t = getToday();
  const stats = await getCycleWeekStats(cycles.map((c) => c.id));
  const items: CycleItem[] = cycles.map((c) => {
    const end = addDays(c.startDate, c.weeks * 7 - 1);
    return {
      id: c.id,
      name: c.name.replace(/^\d+\s*·\s*/, ""),
      goal: c.goal,
      start: c.startDate,
      end,
      dates: `${formatDay(c.startDate, { day: "numeric", month: "short" })} – ${formatDay(end, { day: "numeric", month: "short" })}`,
      pct: c.total - c.skipped > 0 ? Math.round((c.done / (c.total - c.skipped)) * 100) : 0,
      weeks: c.weeks,
      focus: Array.from({ length: c.weeks }, (_, i) => focusLabel(c.weekFocus?.[i + 1]) || `Week ${i + 1}`),
    };
  });
  const current = items.find((c) => c.start <= t && c.end >= t) ?? null;
  const week = current ? Math.floor(diffDays(t, current.start) / 7) + 1 : 1;
  const ws = current ? stats[current.id]?.[week] : undefined;
  const g = await intervalsStatus(me.id);
  return (
    <CyclesScreen
      current={current}
      currentWeek={week}
      currentProgress={ws?.total ? ws.done / ws.total : 0}
      upcoming={items.filter((c) => c.start > t).sort((a, b) => a.start.localeCompare(b.start))}
      finished={items.filter((c) => c.end < t)}
      userName={me.name}
      garmin={{ connected: g.connected, name: g.athleteName }}
    />
  );
}
