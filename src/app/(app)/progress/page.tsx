import { requireUser } from "@/lib/auth";
import { getAllWorkouts, listUsers } from "@/lib/data";
import { computeProgress } from "@/lib/progress";
import { formatDay, today } from "@/lib/dates";
import { StrengthChart, VolumeChart } from "@/components/charts";
import { SportIcon } from "@/components/tandem/icon";
import { ConsistencyBars, SectionLabel, SegmentedLinks, StatTile } from "@/components/tandem/ui";

const sum = (o: Record<string, unknown>) => Object.entries(o).reduce((t, [k, v]) => (k === "week" ? t : t + (Number(v) || 0)), 0);

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const me = await requireUser();
  const { u } = await searchParams;
  const people = await listUsers();
  const viewed = people.find((p) => p.id === u) ?? people.find((p) => p.id === me.id)!;
  const t = today();
  const p = computeProgress(await getAllWorkouts(viewed.id), t);

  const kmNow = Math.round(sum(p.distance.at(-1) ?? { week: "" }) * 10) / 10;
  const kmPrev = Math.round(sum(p.distance.at(-2) ?? { week: "" }) * 10) / 10;
  const hNow = Math.round(sum(p.time.at(-1) ?? { week: "" }) * 10) / 10;
  const hPrev = Math.round(sum(p.time.at(-2) ?? { week: "" }) * 10) / 10;
  const last4 = p.adherence.slice(-4);
  const planned4 = last4.reduce((a, w) => a + w.planned, 0);
  const done4 = last4.reduce((a, w) => a + w.done, 0);
  const delta = (a: number, b: number, unit: string) => (b ? `${a >= b ? "+" : ""}${Math.round((a - b) * 10) / 10} ${unit}` : undefined);

  return (
    <>
      {people.length > 1 && (
        <SegmentedLinks
          label="Whose progress"
          block
          value={viewed.id}
          options={people.map((x) => ({ value: x.id, label: x.id === me.id ? "Me" : x.name, href: x.id === me.id ? "/progress" : `/progress?u=${x.id}` }))}
        />
      )}

      <header className="flex flex-col gap-2">
        <h1 className="t-display-l m-0">Progress</h1>
        <div className="flex items-baseline gap-2">
          <span className="t-stat-xl">{kmNow}</span>
          <span className="td-metric td-muted">km this week</span>
        </div>
      </header>

      <div className="td-tiles">
        <StatTile label="Time" value={String(hNow)} unit="h" delta={delta(hNow, hPrev, "h")} trend={hNow >= hPrev ? "up" : "down"} />
        <StatTile label="Last 4 wk" value={planned4 ? `${Math.round((done4 / planned4) * 100)}` : "–"} unit="%" delta={`${done4} of ${planned4}`} trend="up" />
        <StatTile label="Distance" value={String(kmNow)} unit="km" delta={delta(kmNow, kmPrev, "km")} trend={kmNow >= kmPrev ? "up" : "down"} />
      </div>

      <section className="td-tile" style={{ padding: 16, gap: 12 }}>
        <SectionLabel right={<span className="td-metric-s td-muted">{p.totals.sessions} sessions done</span>}>Consistency</SectionLabel>
        <ConsistencyBars values={p.adherence.map((w) => (w.planned ? w.done / w.planned : 0))} />
      </section>

      <section className="td-tile" style={{ padding: 16, gap: 12 }}>
        <SectionLabel>Weekly volume</SectionLabel>
        <VolumeChart distance={p.distance} time={p.time} />
      </section>

      <section className="td-tile" style={{ padding: 16, gap: 12 }}>
        <SectionLabel>Strength</SectionLabel>
        <StrengthChart exercises={p.exercises.map(({ key, name, points, best, change }) => ({ key, name, points, best, change }))} />
      </section>

      {(p.records.length > 0 || p.exercises.length > 0) && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Records</SectionLabel>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {p.records.map((r) => (
              <li key={r.label} className={`td-card td-s-${r.sport}`} style={{ alignItems: "center" }}>
                <SportIcon sport={r.sport} />
                <span className="t-title">{r.label.replace(/^(Longest|Fastest) (\w+)/, (_, a: string, b: string) => `${a} ${b}`)}</span>
                <span className="text-right">
                  <span className="td-metric" style={{ fontWeight: 600 }}>{r.value}</span>
                  <br />
                  <span className="td-metric-s td-muted">{formatDay(r.date)}</span>
                </span>
              </li>
            ))}
            {p.exercises.slice(0, 6).map((e) => (
              <li key={e.key} className="td-card td-s-gym" style={{ alignItems: "center" }}>
                <SportIcon sport="gym" />
                <span className="t-title">{e.name}</span>
                <span className="td-metric text-right" style={{ fontWeight: 600 }}>
                  {e.best} kg
                  <br />
                  <span className="td-metric-s td-muted">est. 1RM</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
