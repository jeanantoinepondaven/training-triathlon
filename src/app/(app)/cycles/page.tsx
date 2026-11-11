import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCycleWeekStats, listCycles } from "@/lib/data";
import { addDays, diffDays, formatDay, today } from "@/lib/dates";
import { DeleteCycleButton } from "@/components/delete-cycle";
import { ButtonLink, CycleBanner, SectionLabel, StatusTag } from "@/components/tandem/ui";

export default async function CyclesPage() {
  const me = await requireUser();
  const cycles = await listCycles(me.id);
  const t = today();
  const stats = await getCycleWeekStats(cycles.map((c) => c.id));
  const endOf = (c: (typeof cycles)[number]) => addDays(c.startDate, c.weeks * 7 - 1);
  const current = cycles.find((c) => c.startDate <= t && endOf(c) >= t);
  const others = cycles.filter((c) => c !== current);
  const weeksOf = (c: (typeof cycles)[number]) =>
    Array.from({ length: c.weeks }, (_, i) => {
      const s = stats[c.id]?.[i + 1];
      return { focus: c.weekFocus?.[i + 1] ?? `Week ${i + 1}`, done: s?.total ? s.done / s.total : 0 };
    });

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="t-display-l m-0">Cycles</h1>
        <ButtonLink href="/cycles/new" variant={current ? "secondary" : "lane"} icon="plus">
          Import
        </ButtonLink>
      </header>

      {current && (
        <CycleBanner
          href={`/?w=${t}`}
          goal={current.goal}
          name={current.name}
          current={Math.min(current.weeks, Math.floor(diffDays(t, current.startDate) / 7) + 1)}
          weeks={weeksOf(current)}
        />
      )}

      {cycles.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-ink-muted">No cycles yet. Import your first 3-week block to fill your weeks.</p>
          <ButtonLink href="/cycles/new" variant="lane">Import next cycle</ButtonLink>
        </div>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>{current ? "Other cycles" : "All cycles"}</SectionLabel>
          {others.map((c) => {
            const upcoming = t < c.startDate;
            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
            return (
              <article key={c.id} className="td-tile" style={{ padding: 16, gap: 10 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/?w=${c.startDate}`} className="t-title" style={{ color: "var(--ink)", textDecoration: "none" }}>
                      {c.name}
                    </Link>
                    <p className="td-metric-s td-muted m-0">
                      {formatDay(c.startDate, { day: "numeric", month: "short" })} – {formatDay(endOf(c), { day: "numeric", month: "short" })} · {c.weeks} wk
                    </p>
                  </div>
                  {upcoming ? <StatusTag kind="skipped">Upcoming</StatusTag> : <StatusTag kind="done">Finished</StatusTag>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-sunken)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--done)" }} />
                  </div>
                  <span className="td-metric-s td-muted">{c.done}/{c.total}{c.skipped ? ` · ${c.skipped} skipped` : ""}</span>
                </div>
                <div className="flex justify-end">
                  <DeleteCycleButton id={c.id} name={c.name} />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {current && (
        <div className="flex justify-end">
          <DeleteCycleButton id={current.id} name={current.name} />
        </div>
      )}
    </>
  );
}
