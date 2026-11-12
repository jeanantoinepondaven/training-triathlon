"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { addWorkoutQuick, moveWorkout, setStatus } from "@/app/actions/workouts";
import type { Sport, Workout } from "@/db/schema";
import { Symbol } from "@/components/hig/symbol";
import {
  Button,
  ButtonLink,
  CheckButton,
  CycleHeader,
  Field,
  GlassGroup,
  ListSection,
  MenuLayer,
  type MenuItem,
  Pill,
  Screen,
  SegmentedControl,
  Sheet,
  SportIcon,
  type StripDay,
  TabBar,
  Tag,
  WeekStrip,
  cx,
} from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";
import { estimateMinutes, hm, loggedTag, targetLine } from "@/lib/sport";
import { addDays, formatDay, mondayOf } from "@/lib/dates";

export type WW = Pick<Workout, "id" | "date" | "plannedDate" | "sport" | "title" | "status" | "plan" | "log" | "cycleId">;
type Change = { id: string; date?: string; status?: Workout["status"]; add?: WW };

const DN = (d: string) => formatDay(d, { weekday: "short" });
const short = (d: string) => `${DN(d)} ${Number(d.slice(8))}`;

export function WeekScreen({
  title,
  subtitle,
  days,
  today,
  workouts,
  editable,
  people,
  viewedId,
  meId,
  cycle,
  monday,
}: {
  title: string;
  subtitle: string;
  days: string[];
  today: string;
  workouts: WW[];
  editable: boolean;
  people: { id: string; name: string }[];
  viewedId: string;
  meId: string;
  cycle: { name: string; week: number; focus: string[] } | null;
  monday: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(workouts, (cur, c: Change) =>
    c.add ? [...cur, c.add] : cur.map((w) => (w.id === c.id ? { ...w, ...(c.date && { date: c.date }), ...(c.status && { status: c.status }) } : w)),
  );
  const isThisWeek = days.includes(today);
  const [focus, setFocus] = useState(isThisWeek ? today : days[0]);
  const [sheet, setSheet] = useState<{ name: "move"; id: string } | { name: "add"; date: string } | null>(null);
  const [menu, setMenu] = useState<{ items: MenuItem[]; y: number; label: string } | null>(null);
  const ro = !editable;
  const q = (w: string) => `/?w=${w}${editable ? "" : `&u=${viewedId}`}`;

  const statusOf = (s: WW) => (s.status === "planned" && s.date < today ? "missed" : s.status);
  const mins = (s: WW) => estimateMinutes(s);
  const on = (d: string) => items.filter((s) => s.date === d);
  const active = items.filter((s) => s.status !== "skipped");
  const doneN = active.filter((s) => s.status === "done").length;
  const leftMin = active.filter((s) => s.status !== "done").reduce((x, s) => x + mins(s), 0);
  const weekMin = active.reduce((x, s) => x + mins(s), 0);
  const allDone = active.length > 0 && doneN === active.length;
  const stripDays: StripDay[] = days.map((d) => ({
    label: DN(d),
    date: String(Number(d.slice(8))),
    today: d === today,
    load: on(d)
      .filter((s) => s.status !== "skipped")
      .map((s) => ({ sport: s.sport, minutes: mins(s), done: s.status === "done" })),
  }));

  const setSt = (s: WW, status: Workout["status"], msg?: { message: string; icon: string; undo?: boolean }) => {
    const prev = s.status;
    start(async () => {
      apply({ id: s.id, status });
      await setStatus(s.id, status);
    });
    const after = items.map((x) => (x.id === s.id ? { ...x, status } : x)).filter((x) => x.status !== "skipped");
    if (status === "done" && after.length && after.every((x) => x.status === "done")) {
      toast({ message: `Week done · ${after.length} of ${after.length}`, icon: "checkmark.circle.fill", tone: "done", ms: 5000 });
    } else if (msg) {
      toast({ message: msg.message, icon: msg.icon, action: msg.undo ? "Undo" : undefined, onAction: () => setSt({ ...s, status }, prev) });
    }
  };
  const toggleDone = (s: WW) => setSt(s, s.status === "done" ? "planned" : "done");
  const moveTo = (s: WW, date: string, reset = false) => {
    const from = s.date;
    start(async () => {
      apply({ id: s.id, date });
      await moveWorkout(s.id, date);
    });
    toast({
      message: `${reset ? "Back on" : "Moved to"} ${short(date)}`,
      icon: "calendar.badge.clock",
      action: "Undo",
      onAction: () =>
        start(async () => {
          apply({ id: s.id, date: from });
          await moveWorkout(s.id, from);
        }),
    });
  };
  const rowMenu = (s: WW, y: number) =>
    setMenu({
      y,
      label: s.title,
      items: [
        { label: "Open", icon: "chevron.right", onClick: () => router.push(`/workout/${s.id}`) },
        { label: s.status === "done" ? "Mark not done" : "Mark done", icon: "checkmark", onClick: () => toggleDone(s) },
        { label: "Move to…", icon: "calendar.badge.clock", onClick: () => setSheet({ name: "move", id: s.id }) },
        ...(s.date !== s.plannedDate ? [{ label: `Reset to ${short(s.plannedDate)}`, icon: "arrow.uturn.backward", onClick: () => moveTo(s, s.plannedDate, true) }] : []),
        { label: s.status === "skipped" ? "Unskip" : "Skip", icon: "minus.circle", onClick: () => setSt(s, s.status === "skipped" ? "planned" : "skipped", s.status === "skipped" ? undefined : { message: "Skipped", icon: "minus.circle", undo: true }) },
      ],
    });

  const rows = (list: WW[]) =>
    list.map((s) => (
      <SwipeRow
        key={s.id}
        enabled={!ro}
        done={s.status === "done"}
        skipped={s.status === "skipped"}
        onDone={() => toggleDone(s)}
        onMove={() => setSheet({ name: "move", id: s.id })}
        onSkip={() => setSt(s, s.status === "skipped" ? "planned" : "skipped", s.status === "skipped" ? undefined : { message: "Skipped", icon: "minus.circle", undo: true })}
        onLong={(y) => rowMenu(s, y)}
      >
        <SessionRow s={s} status={statusOf(s)} readOnly={ro} today={today} onOpen={() => router.push(`/workout/${s.id}`)} onToggle={() => toggleDone(s)} />
      </SwipeRow>
    ));

  const heroList = on(focus);
  const empty = items.length === 0 && !cycle;
  const owner = people.find((p) => p.id === viewedId);

  const body = empty ? (
    <div className="empty">
      <h2>Nothing planned</h2>
      <p>No cycle covers this week. Import the next block to fill it.</p>
      {!ro && (
        <ButtonLink href="/cycles/new" variant="prominent" size="l" icon="square.and.arrow.down">
          Import cycle
        </ButtonLink>
      )}
    </div>
  ) : (
    <>
      {allDone && (
        <div className="week-done" role="status">
          <span className="ic">
            <Symbol name="checkmark" size={24} weight="bold" />
          </span>
          <div>
            <b>Week done</b>
            <span>
              {doneN} of {active.length} sessions · {hm(weekMin)}
            </span>
          </div>
        </div>
      )}
      <div className="stack">
        {cycle && <CycleHeader name={cycle.name} week={cycle.week} progress={active.length ? doneN / active.length : 0} focus={cycle.focus} />}
        <WeekStrip days={stripDays} selected={days.indexOf(focus)} onSelect={(i) => setFocus(days[i])} />
      </div>
      <div className="stack">
        <div className="hero-head">
          <h2>{focus === today ? "Today" : formatDay(focus, { weekday: "long" })}</h2>
          <span>
            {formatDay(focus, { weekday: focus === today ? "long" : undefined, day: "numeric", month: "short" })}
            {heroList.length ? ` · ${hm(heroList.filter((s) => s.status !== "skipped").reduce((x, s) => x + mins(s), 0))}` : ""}
          </span>
        </div>
        <ListSection>
          {heroList.length ? (
            rows(heroList)
          ) : (
            <div className="rest-cell">
              <span>Rest day</span>
              {!ro && (
                <Button variant="plain" size="s" icon="plus" onClick={() => setSheet({ name: "add", date: focus })}>
                  Add session
                </Button>
              )}
            </div>
          )}
        </ListSection>
      </div>
      {days
        .filter((d) => d !== focus)
        .map((d) => {
          const l = on(d);
          if (!l.length)
            return (
              <div key={d} className="dayhead-rest">
                <h3>{short(d)}</h3>
                <span>Rest</span>
              </div>
            );
          const live = l.filter((s) => s.status !== "skipped");
          const brick = live.some((s) => s.sport === "bike") && live.some((s) => s.sport === "run");
          return (
            <ListSection key={d} header={`${d === today ? "Today · " : ""}${short(d)}`} headerTrailing={`${hm(live.reduce((x, s) => x + mins(s), 0))}${brick ? " · brick" : ""}`}>
              {rows(l)}
            </ListSection>
          );
        })}
    </>
  );

  const moving = sheet?.name === "move" ? items.find((s) => s.id === sheet.id) : null;

  return (
    <>
      <Screen
        title={title}
        subtitle={subtitle}
        leading={
          <GlassGroup
            label="Change week"
            items={[
              { icon: "chevron.left", label: "Previous week", href: q(addDays(monday, -7)) },
              { icon: "chevron.right", label: "Next week", href: q(addDays(monday, 7)) },
            ]}
          />
        }
        trailing={
          <GlassGroup
            label="Week actions"
            items={[
              { icon: "calendar", label: "Back to this week", href: q(today), hidden: isThisWeek },
              { icon: "plus", label: "Add session", hidden: ro, onClick: () => setSheet({ name: "add", date: focus }) },
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
        <div className="stack">
          <div className="wk-bar">
            {people.length > 1 ? (
              <SegmentedControl
                label="Whose week"
                value={viewedId}
                options={people.map((p) => ({ value: p.id, label: p.id === meId ? "Me" : p.name, href: `/?w=${monday}${p.id === meId ? "" : `&u=${p.id}`}` }))}
              />
            ) : (
              <span />
            )}
            {!empty && (
              <div className="wk-sum">
                <b>
                  {doneN} of {active.length} done
                </b>
                {leftMin ? `${hm(leftMin)} left` : "All done"}
              </div>
            )}
          </div>
          {ro && (
            <div className="ro-note">
              <Symbol name="eye" size={15} weight="semibold" />
              {owner?.name}’s week · view only
            </div>
          )}
        </div>
        {body}
      </Screen>

      {moving && <MoveSheet s={moving} items={items} today={today} onClose={() => setSheet(null)} onMove={(d, reset) => moveTo(moving, d, reset)} />}
      {sheet?.name === "add" && (
        <AddSheet
          date={sheet.date}
          days={days}
          items={items}
          today={today}
          onClose={() => setSheet(null)}
          onAdd={(v) => {
            setSheet(null);
            start(async () => {
              const id = await addWorkoutQuick(v);
              toast({ message: `Added to ${short(v.date)}`, icon: "plus", action: "Open", onAction: () => router.push(`/workout/${id}`) });
              if (mondayOf(v.date) !== monday) router.push(q(v.date));
            });
          }}
        />
      )}
      {menu && <MenuLayer items={menu.items} y={menu.y} label={menu.label} onClose={() => setMenu(null)} />}
    </>
  );
}

function SessionRow({ s, status, readOnly, today, onOpen, onToggle }: { s: WW; status: string; readOnly: boolean; today: string; onOpen: () => void; onToggle: () => void }) {
  const logged = loggedTag(s);
  return (
    <div className={cx("hig-session", `is-${status}`, s.date === today && "is-today")} onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()} aria-label={`${s.sport}, ${s.title}`}>
      <SportIcon sport={s.sport} muted={status === "skipped"} />
      <div className="hig-session-text">
        <span className="title">{s.title}</span>
        <span className="target">{targetLine(s) || "Open to see the plan"}</span>
        {(s.date !== s.plannedDate || status === "skipped" || status === "missed" || logged) && (
          <span className="tags">
            {s.date !== s.plannedDate && (
              <Tag kind="moved" icon="calendar.badge.clock">
                From {mondayOf(s.plannedDate) === mondayOf(s.date) ? DN(s.plannedDate) : formatDay(s.plannedDate, { day: "numeric", month: "short" })}
              </Tag>
            )}
            {status === "skipped" && (
              <Tag kind="skipped" icon="minus.circle">
                Skipped
              </Tag>
            )}
            {status === "missed" && (
              <Tag kind="missed" icon="exclamationmark.circle">
                Not done
              </Tag>
            )}
            {logged && <Tag kind="done">{logged}</Tag>}
          </span>
        )}
      </div>
      {status !== "skipped" && <CheckButton checked={s.status === "done"} readOnly={readOnly} label={`Mark ${s.title} done`} onChange={onToggle} />}
    </div>
  );
}

/** Swipe right = Done, swipe left = Move / Skip. Long-press or right-click opens the menu. */
function SwipeRow({ enabled, done, skipped, onDone, onMove, onSkip, onLong, children }: { enabled: boolean; done: boolean; skipped: boolean; onDone: () => void; onMove: () => void; onSkip: () => void; onLong: (y: number) => void; children: React.ReactNode }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<{ x: number; y: number; base: number; horiz: boolean | null; moved: boolean } | null>(null);
  const lp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = useRef(0);
  const longFired = useRef(false);
  const swiped = useRef(0);
  const dxRef = useRef(0);
  const clearLp = () => {
    if (lp.current) clearTimeout(lp.current);
    lp.current = null;
  };
  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDx(0);
    open.current = 0;
    fn();
  };
  return (
    <div
      className="hig-swipe"
      onContextMenu={(e) => {
        if (!enabled) return;
        e.preventDefault();
        onLong(e.clientY);
      }}
    >
      {enabled && (
        <div className="hig-swipe-acts lead" style={{ opacity: dx > 0 ? 1 : 0 }}>
          <button type="button" className="a-done" tabIndex={-1} onClick={act(onDone)}>
            <Symbol name="checkmark" size={20} weight="bold" />
            {done ? "Undo" : "Done"}
          </button>
        </div>
      )}
      {enabled && (
        <div className="hig-swipe-acts trail" style={{ opacity: dx < 0 ? 1 : 0 }}>
          <button type="button" className="a-move" tabIndex={-1} onClick={act(onMove)}>
            <Symbol name="calendar.badge.clock" size={20} weight="semibold" />
            Move
          </button>
          <button type="button" className="a-skip" tabIndex={-1} onClick={act(onSkip)}>
            <Symbol name="minus.circle" size={20} weight="semibold" />
            {skipped ? "Unskip" : "Skip"}
          </button>
        </div>
      )}
      <div
        className="slide"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 260ms cubic-bezier(.3,1.2,.5,1)" }}
        onPointerDown={(e) => {
          if (!enabled || e.button === 2) return;
          g.current = { x: e.clientX, y: e.clientY, base: open.current, horiz: null, moved: false };
          const y0 = e.clientY;
          clearLp();
          lp.current = setTimeout(() => {
            if (g.current && !g.current.moved) {
              g.current = null;
              longFired.current = true;
              onLong(y0 + 8);
            }
          }, 520);
        }}
        onPointerMove={(e) => {
          const s = g.current;
          if (!s) return;
          const ddx = e.clientX - s.x;
          const ddy = e.clientY - s.y;
          if (s.horiz === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
            s.horiz = Math.abs(ddx) > Math.abs(ddy);
            s.moved = true;
            clearLp();
            if (s.horiz) {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
              setDragging(true);
            }
          }
          if (s.horiz) {
            const nv = Math.max(-170, Math.min(110, s.base + ddx));
            dxRef.current = nv;
            setDx(nv);
          }
        }}
        onPointerUp={() => {
          clearLp();
          const s = g.current;
          g.current = null;
          if (!s || !s.horiz) return;
          setDragging(false);
          const v = dxRef.current;
          if (v > 70) {
            setDx(0);
            open.current = 0;
            onDone();
          } else if (v < -70) {
            setDx(-148);
            open.current = -148;
          } else {
            setDx(0);
            open.current = 0;
          }
          swiped.current = Date.now();
        }}
        onPointerCancel={() => {
          clearLp();
          g.current = null;
          setDragging(false);
          setDx(open.current);
        }}
        onClickCapture={(e) => {
          if (longFired.current) {
            longFired.current = false;
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          if (Date.now() - swiped.current < 250) {
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          if (open.current !== 0) {
            e.stopPropagation();
            e.preventDefault();
            setDx(0);
            open.current = 0;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

function stripFor(days: string[], items: WW[], today: string, extra?: WW) {
  return days.map((d) => ({
    label: DN(d),
    date: String(Number(d.slice(8))),
    today: d === today,
    load: [...(extra && extra.date === d ? [extra] : []), ...items.filter((x) => x.date === d && x.status !== "skipped" && x.id !== extra?.id)].map((x) => ({
      sport: x.sport,
      minutes: estimateMinutes(x),
      done: x.status === "done",
    })),
  }));
}

export function MoveSheet({ s, items, today, onClose, onMove }: { s: WW; items: WW[]; today: string; onClose: () => void; onMove: (date: string, reset?: boolean) => void }) {
  const m = mondayOf(s.date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(m, i));
  const [pick, setPick] = useState<number | null>(null);
  const [other, setOther] = useState("");
  const target = other || (pick !== null ? days[pick] : null);
  return (
    <Sheet
      title={`Move ${s.title}`}
      subtitle={`Now ${short(s.date)} · ${hm(estimateMinutes(s))}`}
      onClose={onClose}
      onDone={() => {
        if (target && target !== s.date) onMove(target);
        onClose();
      }}
      doneDisabled={!target || target === s.date}
    >
      <div className="sheet-label">Pick a day. Bars show what’s already on it.</div>
      <WeekStrip days={stripFor(days, items, today, s)} moveMode from={days.indexOf(s.date)} selected={pick} onSelect={(i) => days[i] !== s.date && (setPick(i), setOther(""))} />
      <ListSection footer="For another week, pick a date.">
        <div className="hig-field">
          <label htmlFor="move-date">Another date</label>
          <div className="hig-field-in">
            <input id="move-date" type="date" value={other} onChange={(e) => (setOther(e.target.value), setPick(null))} />
          </div>
        </div>
      </ListSection>
      {s.date !== s.plannedDate && (
        <Button variant="bordered" size="l" full icon="arrow.uturn.backward" onClick={() => (onMove(s.plannedDate, true), onClose())}>
          Reset to {short(s.plannedDate)}
        </Button>
      )}
    </Sheet>
  );
}

function AddSheet({ date, days, items, today, onClose, onAdd }: { date: string; days: string[]; items: WW[]; today: string; onClose: () => void; onAdd: (v: { sport: Sport; title: string; date: string; target: string; minutes: number }) => void }) {
  const [v, setV] = useState({ sport: "run" as Sport, title: "", day: Math.max(0, days.indexOf(date)), target: "", mins: "45" });
  const set = (k: keyof typeof v, x: string | number) => setV((cur) => ({ ...cur, [k]: x }));
  const ok = v.title.trim().length > 0;
  const go = () => ok && onAdd({ sport: v.sport, title: v.title.trim(), date: days[v.day], target: v.target.trim(), minutes: parseInt(v.mins) || 45 });
  return (
    <Sheet title="Add session" subtitle="One-off, outside the cycle" onClose={onClose} onDone={go} doneLabel="Add" doneDisabled={!ok} dim={false}>
      <div className="pills" role="radiogroup" aria-label="Sport">
        {(["swim", "bike", "run", "gym", "other"] as Sport[]).map((sp) => (
          <Pill key={sp} sport={sp} selected={v.sport === sp} onClick={() => set("sport", sp)} />
        ))}
      </div>
      <ListSection>
        <Field id="add-title" label="Title" placeholder="Easy spin" value={v.title} onChange={(x) => set("title", x)} />
        <Field id="add-target" label="Target" placeholder="1 h · Z2" value={v.target} onChange={(x) => set("target", x)} />
        <Field id="add-mins" label="Duration" suffix="min" inputMode="numeric" value={v.mins} onChange={(x) => set("mins", x.replace(/[^0-9]/g, ""))} />
      </ListSection>
      <div className="sheet-label">Day</div>
      <WeekStrip days={stripFor(days, items, today)} selected={v.day} onSelect={(i) => set("day", i)} />
      <Button variant="prominent" size="xl" full icon="plus" disabled={!ok} onClick={go}>
        Add to {short(days[v.day])}
      </Button>
    </Sheet>
  );
}
