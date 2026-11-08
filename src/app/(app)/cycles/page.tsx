import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCycles } from "@/lib/data";
import { addDays, formatDay, today } from "@/lib/dates";
import { DeleteCycleButton } from "@/components/delete-cycle";

export default async function CyclesPage() {
  const me = await requireUser();
  const cycles = await listCycles(me.id);
  const t = today();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cycles</h1>
        <Link href="/cycles/new" className="btn-primary py-2">+ Import</Link>
      </div>
      {cycles.length === 0 && <p className="text-sm text-muted">No cycles yet. Import your first 3-week block.</p>}
      <ul className="space-y-3">
        {cycles.map((c) => {
          const end = addDays(c.startDate, c.weeks * 7 - 1);
          const state = t < c.startDate ? "Upcoming" : t > end ? "Finished" : "Current";
          const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
          return (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/?w=${c.startDate}`} className="font-medium hover:text-accent">{c.name}</Link>
                  <p className="text-sm text-muted">
                    {formatDay(c.startDate)} → {formatDay(end)} · {c.weeks} weeks
                  </p>
                  {c.goal && <p className="text-sm text-muted">{c.goal}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${state === "Current" ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>{state}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm tabular-nums text-muted">{c.done}/{c.total} done{c.skipped ? ` · ${c.skipped} skipped` : ""}</span>
              </div>
              <div className="mt-2 text-right"><DeleteCycleButton id={c.id} name={c.name} /></div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
