"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { Sport, Workout } from "@/db/schema";
import { Symbol } from "@/components/hig/symbol";
import { Button, GlassGroup, ListRow, ListSection, MenuLayer, type MenuItem, ProgressView, Screen, Sheet, SportIcon, TabBar, Toggle, cx } from "@/components/hig/ui";
import { ToastSlot } from "@/components/hig/toast";
import { setStatus } from "@/app/actions/workouts";
import { setHomeModules } from "@/app/actions/races";
import { SessionRow, type WW } from "@/components/week-screen";
import { AddTargetSheet, RaceRow, RaceSheet, TargetRow, TargetSheet, type AutoNow, type Person, type RaceLite } from "@/components/races-ui";
import { goalRace, raceLegs, taperStart, upcoming } from "@/lib/races";
import type { TargetView } from "@/lib/races";
import { HOME_MODULES, type HomeModule } from "@/lib/home-modules";
import { addDays, diffDays, formatDay, isoWeek, mondayOf } from "@/lib/dates";
import { hm } from "@/lib/sport";

export type HomeSession = WW & { minutes: number };
type SeasonCycle = { name: string; start: string; focus: string[] };

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SPORT_WORD: Record<Sport, string> = { swim: "Swim", bike: "Bike", run: "Run", gym: "Gym", other: "Other" };
const longD = (d: string) => formatDay(d, { weekday: "long", day: "numeric", month: "long" });
const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });
const min2 = (m: number) => (m < 60 ? `${m}′` : hm(m).replace(" h ", ":").replace(/ h$/, ":00"));

function cycleAt(season: SeasonCycle[], d: string) {
  for (const c of season) {
    const i = Math.floor(diffDays(d, c.start) / 7);
    if (d >= c.start && i < c.focus.length) return { c, focus: c.focus[i] };
  }
  return null;
}
const focusClass = (f: string) => (/easy|recover/i.test(f) ? "f-recovery" : /\+|race|sharpen|peak|build/i.test(f) ? "f-build" : "f-base");

export function HomeScreen({
  me,
  partner,
  today,
  hidden,
  races,
  targets,
  week,
  partnerWeek,
  season,
  curFocus,
  load,
  highlight,
  autoNow,
}: {
  me: Person;
  partner: Person | null;
  today: string;
  hidden: string[];
  races: RaceLite[];
  targets: TargetView[];
  week: HomeSession[];
  partnerWeek: HomeSession[];
  season: SeasonCycle[];
  curFocus: string | null;
  load: { week: string; hours: number }[];
  highlight: { title: string; sub: string } | null;
  autoNow: AutoNow;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(week, (cur, c: { id: string; status: Workout["status"] }) => cur.map((w) => (w.id === c.id ? { ...w, status: c.status } : w)));
  const [sheet, setSheet] = useState<{ name: "addRace" } | { name: "addTarget" } | { name: "editHome" } | { name: "target"; id: string } | null>(null);
  const [menu, setMenu] = useState<{ items: MenuItem[]; y: number; label: string } | null>(null);
  const [mods, setMods] = useState<Record<HomeModule, boolean>>(() => Object.fromEntries(HOME_MODULES.map((m) => [m.id, !hidden.includes(m.id)])) as Record<HomeModule, boolean>);

  const monday = mondayOf(today);
  const live = items.filter((s) => s.status !== "skipped");
  const doneW = live.filter((s) => s.status === "done");
  const minsW = live.reduce((x, s) => x + s.minutes, 0);
  const minsD = doneW.reduce((x, s) => x + s.minutes, 0);
  const todays = items.filter((s) => s.date === today);
  const ups = upcoming(races, me.id, today);
  const goal = goalRace(races, me.id, today);
  const plannedTo = season.reduce((mx, c) => {
    const e = addDays(c.start, c.focus.length * 7 - 1);
    return e > mx ? e : mx;
  }, today);

  const toggle = (s: WW) => {
    const status = s.status === "done" ? "planned" : "done";
    start(async () => {
      apply({ id: s.id, status });
      await setStatus(s.id, status);
    });
  };
  const setMod = (id: HomeModule, v: boolean) => {
    const next = { ...mods, [id]: v };
    setMods(next);
    start(() => setHomeModules(HOME_MODULES.filter((m) => next[m.id]).map((m) => m.id)));
  };

  const out: React.ReactNode[] = [];

  /* 1. Goal race countdown */
  if (mods.race) {
    if (goal) {
      const n = diffDays(goal.date, today);
      const seasonStart = season[0]?.start ?? today;
      const total = Math.max(1, diffDays(goal.date, seasonStart));
      const gone = Math.max(0, diffDays(today, seasonStart));
      const taper = taperStart(goal) ?? goal.date;
      out.push(
        <Link key="race" href={`/races/${goal.id}`} className="race-hero">
          <div className="rh-top">
            <span className="rh-eyebrow">
              <Symbol name="flag" size={14} weight="semibold" />
              {goal.priority === "A" ? "Goal race" : "Next race"}
            </span>
            <span>{longD(goal.date)}</span>
          </div>
          <div className="rh-main">
            <div className="rh-count">
              <b>{n}</b>
              <span>{n === 1 ? "day to go" : "days to go"}</span>
            </div>
            <div className="rh-name">
              <b>{goal.name}</b>
              <span>
                {goal.dist}
                {goal.goalTime ? ` · goal ${goal.goalTime}` : ""}
              </span>
              <div className="rh-legs">
                {raceLegs(goal).map(([s, d], i) => (
                  <SportIcon key={i} sport={s} tag>
                    {goal.legGoals?.[s as "swim"] ? `${d} · ${goal.legGoals[s as "swim"]}` : d}
                  </SportIcon>
                ))}
              </div>
            </div>
          </div>
          <ProgressView value={Math.min(1, gone / total)} />
          <div className="rh-foot">
            <span>
              Week {Math.floor(gone / 7) + 1} of {Math.ceil(total / 7)}
            </span>
            <span>{taperStart(goal) ? `Taper from ${dm(taper)}` : "No taper"}</span>
          </div>
          {plannedTo < taper && (
            <div className="rh-hint">
              <Symbol name="exclamationmark.circle" size={15} weight="semibold" />
              {season.length ? `Plan loaded to ${dm(plannedTo)}. ${Math.ceil(diffDays(taper, plannedTo) / 7)} weeks to load before the taper.` : "No plan loaded yet. Import a cycle so the taper lands on the right weeks."}
            </div>
          )}
        </Link>,
      );
    } else {
      out.push(
        <div key="race" className="race-hero" role="button" tabIndex={0} onClick={() => setSheet({ name: "addRace" })}>
          <div className="rh-top">
            <span className="rh-eyebrow">
              <Symbol name="flag" size={14} weight="semibold" />
              Goal race
            </span>
          </div>
          <div className="rh-name">
            <b>Add your goal race</b>
            <span>The countdown, taper and season calendar build around it.</span>
          </div>
        </div>,
      );
    }
  }

  /* 2. Today */
  if (mods.today) {
    const raceToday = races.filter((r) => r.date === today && (r.who === "both" || r.who === me.id));
    const mT = todays.filter((s) => s.status !== "skipped").reduce((x, s) => x + s.minutes, 0);
    out.push(
      <div key="today" className="stack">
        <div className="hero-head">
          <h2>Today</h2>
          <span>
            {formatDay(today, { weekday: "long", day: "numeric" })}
            {mT ? ` · ${hm(mT)}` : ""}
          </span>
        </div>
        <ListSection>
          {raceToday.map((r) => (
            <RaceRow key={r.id} r={r} today={today} />
          ))}
          {todays.length
            ? todays.map((s) => <SessionRow key={s.id} s={s} status={s.status} readOnly={false} today={today} onOpen={() => router.push(`/workout/${s.id}`)} onToggle={() => toggle(s)} />)
            : !raceToday.length && (
                <div className="rest-cell">
                  <span>Rest day</span>
                  <Button variant="plain" size="s" icon="plus" onClick={() => router.push(`/week?w=${today}`)}>
                    Add session
                  </Button>
                </div>
              )}
          <ListRow title="Open the week" detail={`${curFocus ? `${curFocus} · ` : ""}Week ${isoWeek(today)}`} chevron href="/week" />
        </ListSection>
      </div>,
    );
  }

  /* 3. This week by sport */
  if (mods.week && live.length) {
    const bySport = (["swim", "bike", "run", "gym", "other"] as Sport[])
      .map((sp) => {
        const l = live.filter((s) => s.sport === sp);
        return { sp, plan: l.reduce((x, s) => x + s.minutes, 0), done: l.filter((s) => s.status === "done").reduce((x, s) => x + s.minutes, 0) };
      })
      .filter((r) => r.plan);
    out.push(
      <ListSection key="week" header="This week" headerTrailing={`${doneW.length} of ${live.length} done`}>
        <div className="wk-card">
          <div className="wk-big">
            <b>{hm(minsD)}</b>
            <span>of {hm(minsW)} planned</span>
          </div>
          <ProgressView value={minsW ? minsD / minsW : 0} />
          <div className="sport-bars">
            {bySport.map((r) => (
              <div key={r.sp} className="sb-row">
                <SportIcon sport={r.sp} size="s" />
                <span className="sb-name">{SPORT_WORD[r.sp]}</span>
                <span className="sb-bar">
                  <i className={`s-${r.sp}`} style={{ width: `${Math.round((r.done / r.plan) * 100)}%` }} />
                </span>
                <span className="sb-val">
                  {min2(r.done)} / {min2(r.plan)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ListSection>,
    );
  }

  /* 4. Races */
  if (mods.races) {
    out.push(
      <ListSection key="races" header="Races" headerTrailing={`${ups.length} upcoming`}>
        {ups.slice(0, 3).map((r) => (
          <RaceRow key={r.id} r={r} today={today} detail showDate />
        ))}
        <ListRow title="All races" detail={String(races.filter((r) => r.who === "both" || r.who === me.id).length)} chevron href="/races" />
        <ListRow title={<span style={{ color: "var(--tint-ink)", fontWeight: 600 }}>Add race</span>} leading={<Symbol name="plus" size={18} weight="semibold" style={{ color: "var(--tint-ink)" }} />} onClick={() => setSheet({ name: "addRace" })} />
      </ListSection>,
    );
  }

  /* 5. Targets */
  if (mods.targets) {
    out.push(
      <ListSection key="targets" header="Targets" headerTrailing={targets.length ? `${targets.filter((t) => (t.lowerIsBetter ? t.now <= t.goalValue : t.now >= t.goalValue)).length} of ${targets.length} reached` : undefined}>
        {targets.map((t) => (
          <TargetRow key={t.id} t={t} today={today} onOpen={() => setSheet({ name: "target", id: t.id })} />
        ))}
        <ListRow title={<span style={{ color: "var(--tint-ink)", fontWeight: 600 }}>Add target</span>} leading={<Symbol name="target" size={18} weight="semibold" style={{ color: "var(--tint-ink)" }} />} onClick={() => setSheet({ name: "addTarget" })} />
      </ListSection>,
    );
  }

  /* 6. Training load */
  if (mods.load) {
    const hist = load.map((l) => l.hours);
    const mx = Math.max(1, ...hist, minsW / 60) * 1.1;
    const last4 = hist.slice(-4);
    const avg4 = last4.reduce((x, y) => x + y, 0) / Math.max(1, last4.length);
    const nowH = minsW / 60;
    out.push(
      <ListSection key="load" padded>
        <div>
          <div className="chart-head">
            <b>Training load</b>
            <span>Hours per week</span>
          </div>
          <div className="loadbars" role="img" aria-label={`Hours per week for the last 8 weeks. This week ${(minsD / 60).toFixed(1)} of ${nowH.toFixed(1)} hours planned.`}>
            {load.map((l) => (
              <div key={l.week} className="lb">
                <span className="lb-v">{l.hours.toFixed(1)}</span>
                <i className="past" style={{ height: `${Math.round((l.hours / mx) * 72)}px` }} />
                <span className="lb-l">W{isoWeek(l.week)}</span>
              </div>
            ))}
            <div className="lb now">
              <span className="lb-v">{nowH.toFixed(1)}</span>
              <i className="plan" style={{ height: `${Math.round((nowH / mx) * 72)}px` }}>
                <i className="done" style={{ height: `${Math.round((minsD / Math.max(1, minsW)) * 100)}%` }} />
              </i>
              <span className="lb-l">Now</span>
            </div>
          </div>
          <div className="axis">
            <span>4-week average {avg4.toFixed(1)} h</span>
            <span>{!avg4 ? "No history yet" : nowH > avg4 * 1.15 ? "Heavier than usual" : nowH < avg4 * 0.7 ? "Lighter week" : "In your usual range"}</span>
          </div>
        </div>
      </ListSection>,
    );
  }

  /* 7. Season calendar */
  if (mods.season) out.push(<SeasonCal key="season" season={season} races={races} meId={me.id} today={today} goal={goal} />);

  /* 8. Partner */
  if (mods.partner && partner) {
    const pLive = partnerWeek.filter((s) => s.status !== "skipped");
    const pToday = partnerWeek.filter((s) => s.date === today);
    const together = live.find((s) => s.date >= today && pLive.some((q) => q.date === s.date && q.sport === s.sport));
    out.push(
      <ListSection key="partner" header={partner.name} headerTrailing={`${pLive.filter((s) => s.status === "done").length} of ${pLive.length} done this week`}>
        {pToday.map((s) => (
          <SessionRow key={s.id} s={s} status={s.status} readOnly today={today} onOpen={() => router.push(`/workout/${s.id}`)} onToggle={() => {}} />
        ))}
        {together && (
          <ListRow
            leading={
              <span className="hig-sporticon s-other">
                <Symbol name="person.2" size={20} weight="semibold" />
              </span>
            }
            title={`Together ${formatDay(together.date, { weekday: "short", day: "numeric" })}`}
            subtitle={`${together.title} · both planned`}
            chevron
            href={`/week?w=${together.date}`}
          />
        )}
        <ListRow title={`${partner.name}’s week`} chevron href={`/week?w=${monday}&u=${partner.id}`} />
      </ListSection>,
    );
  }

  /* 9. Highlight */
  if (mods.highlight && highlight) {
    out.push(
      <Link key="hl" href="/progress" className="story" style={{ color: "inherit", textDecoration: "none" }}>
        <span className="ic">
          <Symbol name="trophy" size={20} weight="bold" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{highlight.title}</b>
          <span>{highlight.sub}</span>
        </div>
        <Symbol name="chevron.right" size={14} weight="semibold" style={{ color: "var(--label-tertiary)" }} />
      </Link>,
    );
  }

  const shown = HOME_MODULES.filter((m) => mods[m.id]).length;
  out.push(
    <div key="edit" className="home-edit">
      <Button variant="bordered" size="s" icon="slider.horizontal.3" onClick={() => setSheet({ name: "editHome" })}>
        Edit Home · {shown} of {HOME_MODULES.length} cards
      </Button>
    </div>,
  );

  const target = sheet?.name === "target" ? targets.find((t) => t.id === sheet.id) : null;

  return (
    <>
      <Screen
        title="Home"
        subtitle={`${longD(today)}${curFocus ? ` · ${curFocus} week` : ""}`}
        leading={
          // eslint-disable-next-line @next/next/no-img-element
          <img className="tb-icon" alt="Tandem" src="/logo.svg" />
        }
        trailing={
          <GlassGroup
            label="Home actions"
            items={[
              { icon: "slider.horizontal.3", label: "Edit Home", onClick: () => setSheet({ name: "editHome" }) },
              {
                icon: "plus",
                label: "Add",
                onClick: () =>
                  setMenu({
                    y: 70,
                    label: "Add",
                    items: [
                      { label: "Session", icon: "calendar", onClick: () => router.push(`/week?w=${today}`) },
                      { label: "Race", icon: "flag", onClick: () => setSheet({ name: "addRace" }) },
                      { label: "Target", icon: "target", onClick: () => setSheet({ name: "addTarget" }) },
                    ],
                  }),
              },
            ]}
          />
        }
        floating={
          <>
            <ToastSlot />
            <TabBar />
          </>
        }
      >
        {out}
      </Screen>
      {sheet?.name === "addRace" && <RaceSheet me={me} partner={partner} today={today} onClose={() => setSheet(null)} onSaved={(id) => router.push(`/races/${id}`)} />}
      {sheet?.name === "addTarget" && <AddTargetSheet today={today} races={ups} autoNow={autoNow} onClose={() => setSheet(null)} />}
      {target && <TargetSheet t={target} today={today} races={ups} onClose={() => setSheet(null)} />}
      {sheet?.name === "editHome" && (
        <Sheet title="Edit Home" subtitle="Choose the cards you want" onClose={() => setSheet(null)} onDone={() => setSheet(null)} dim={false}>
          <ListSection footer="Week, Progress and Cycles keep everything. Home is the summary.">
            {HOME_MODULES.map((m) => (
              <Toggle key={m.id} label={m.label} checked={mods[m.id]} onChange={(x) => setMod(m.id, x)} />
            ))}
          </ListSection>
          <Button variant="bordered" size="l" full onClick={() => HOME_MODULES.forEach((m) => !mods[m.id] && setMod(m.id, true))}>
            Show all cards
          </Button>
        </Sheet>
      )}
      {menu && <MenuLayer items={menu.items} y={menu.y} label={menu.label} onClose={() => setMenu(null)} />}
    </>
  );
}

/** Every week from this month to the goal race. Planned weeks are filled by focus, races are marked. */
function SeasonCal({ season, races, meId, today, goal }: { season: SeasonCycle[]; races: RaceLite[]; meId: string; today: string; goal: RaceLite | null }) {
  const first = `${today.slice(0, 8)}01`;
  let startM = mondayOf(first);
  if (startM < first) startM = addDays(startM, 7);
  const endD = goal ? addDays(goal.date, 14) : addDays(today, 150);
  const mine = races.filter((r) => r.who === "both" || r.who === meId);
  const taper = goal ? taperStart(goal) : null;
  const rows: { key: string; weeks: { m: string; focus: string | null; race?: RaceLite; taper: boolean; now: boolean; past: boolean }[] }[] = [];
  for (let m = startM; m <= endD; m = addDays(m, 7)) {
    const key = m.slice(0, 7);
    if (!rows.length || rows[rows.length - 1].key !== key) rows.push({ key, weeks: [] });
    const cy = cycleAt(season, m);
    rows[rows.length - 1].weeks.push({
      m,
      focus: cy?.focus ?? null,
      race: mine.find((r) => mondayOf(r.date) === m),
      taper: !!(goal && taper && m >= taper && m < mondayOf(goal.date)),
      now: m === mondayOf(today),
      past: addDays(m, 6) < today,
    });
  }
  return (
    <ListSection header="Season" headerTrailing={goal ? `To ${goal.name}` : undefined} padded>
      <div className="season">
        {rows.map((row) => (
          <div key={row.key} className="sz-row">
            <span className="sz-m">{MN[Number(row.key.slice(5, 7)) - 1]}</span>
            <div className="sz-weeks">
              {row.weeks.map((w) => (
                <Link
                  key={w.m}
                  href={w.race ? `/races/${w.race.id}` : `/week?w=${w.m}`}
                  className={cx("sz-w", w.focus && focusClass(w.focus), !w.focus && "is-open", w.taper && "is-taper", w.now && "is-now", w.past && "is-past")}
                  aria-label={`Week of ${dm(w.m)}, ${w.focus ?? "not planned"}${w.race ? `, ${w.race.name}` : ""}${w.taper ? ", taper" : ""}`}
                  title={`Week of ${dm(w.m)}${w.focus ? ` · ${w.focus}` : ""}`}
                >
                  {w.race ? <span className={`sz-r p-${w.race.priority}`}>{w.race.priority}</span> : <span className="sz-d">{Number(w.m.slice(8))}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span className="lg">
          <i className="sz-w f-base" />
          Load
        </span>
        <span className="lg">
          <i className="sz-w f-build" />
          Heavy · race
        </span>
        <span className="lg">
          <i className="sz-w f-recovery" />
          Easy
        </span>
        <span className="lg">
          <i className="sz-w is-taper" />
          Taper
        </span>
        <span className="lg">
          <i className="sz-w is-open" />
          Not planned
        </span>
        <span className="lg">
          <span className="sz-r p-A">A</span>
          Race
        </span>
      </div>
    </ListSection>
  );
}
