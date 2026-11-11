"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Sport } from "@/db/schema";
import { Icon, SportIcon, SportTag, type IconName } from "./icon";
import { Button, Notice, StatusTag } from "./ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function DoneTick({ checked, onChange, readOnly, label }: { checked: boolean; onChange?: (next: boolean) => void; readOnly?: boolean; label?: string }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={readOnly || undefined}
      aria-label={(checked ? "Done: " : "Mark done: ") + (label ?? "session")}
      className={cx("td-tick", pop && "td-pop")}
      onClick={(e) => {
        e.stopPropagation();
        if (readOnly) return;
        const next = !checked;
        setPop(next);
        if (next && typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
        onChange?.(next);
      }}
    >
      <Icon name="check" strokeWidth={2.6} />
    </button>
  );
}

export type CardStatus = "planned" | "done" | "skipped" | "missed";
export type Step = { text: string; note?: string; easy?: boolean };

export function SessionCard({
  href,
  sport,
  title,
  target,
  status = "planned",
  movedFrom,
  logged,
  readOnly,
  onToggle,
  onMove,
  lifted,
  hero,
  slot,
  stat,
  steps,
}: {
  href: string;
  sport: Sport;
  title: string;
  target?: string;
  status?: CardStatus;
  movedFrom?: string;
  logged?: string;
  readOnly?: boolean;
  onToggle?: (done: boolean) => void;
  onMove?: () => void;
  lifted?: boolean;
  hero?: boolean;
  slot?: string;
  stat?: { value: string; unit: string } | null;
  steps?: Step[];
}) {
  const tags = (
    <>
      {status === "skipped" && <StatusTag kind="skipped">Skipped</StatusTag>}
      {status === "missed" && <StatusTag kind="missed">Missed</StatusTag>}
      {movedFrom && <StatusTag kind="moved">Moved from {movedFrom}</StatusTag>}
      {logged && <span className="td-metric-s td-muted">{logged}</span>}
    </>
  );
  const hasTags = status === "skipped" || status === "missed" || !!movedFrom || !!logged;
  const tick = status === "skipped" ? null : <DoneTick checked={status === "done"} readOnly={readOnly} label={title} onChange={onToggle} />;
  const showMove = !readOnly && onMove && status !== "done";
  const actions = showMove ? (
    <div className="td-card-actions" style={hero ? { gridColumn: "1 / -1", marginTop: 8 } : undefined}>
      <Button variant="ghost" size="sm" icon="move" onClick={(e) => (e.stopPropagation(), onMove())}>
        Move
      </Button>
    </div>
  ) : null;
  const stepList = steps?.length ? (
    <ol className="td-steps td-metric">
      {steps.map((s, i) => (
        <li key={i} className={s.easy ? "td-easy" : undefined}>
          <span>{s.text}</span>
          <span className="td-muted">{s.note ?? ""}</span>
        </li>
      ))}
    </ol>
  ) : null;

  if (hero) {
    return (
      <article className={cx("td-card td-card-hero", `td-s-${sport}`, status === "done" && "td-card-done", lifted && "td-card-lifted")}>
        <div className="td-card-body">
          <div className="td-hero-head">
            <SportTag sport={sport} />
            {slot && <span className="td-metric-s td-muted">{slot}</span>}
          </div>
          <Link href={href} className="td-card-link">
            <h3 className="td-card-title" style={{ marginTop: 10 }}>{title}</h3>
          </Link>
          {stat && (
            <div className="td-hero-stat">
              <b>{stat.value}</b>
              <span className="td-metric td-muted">{stat.unit}</span>
            </div>
          )}
          {target && <div className="td-card-target td-metric">{target}</div>}
          {hasTags && <div className="td-card-meta">{tags}</div>}
        </div>
        {tick}
        {stepList}
        {actions}
      </article>
    );
  }
  return (
    <article className={cx("td-card", `td-s-${sport}`, `td-card-${status}`, lifted && "td-card-lifted")}>
      <SportIcon sport={sport} />
      <Link href={href} className="td-card-link td-card-body">
        <h3 className="td-card-title">{title}</h3>
        {target && <div className="td-card-target td-metric">{target}</div>}
        {hasTags && <div className="td-card-meta">{tags}</div>}
      </Link>
      {tick ?? <span />}
      {actions}
    </article>
  );
}

export type DayLoad = { sport: Sport; min: number; done?: boolean };
export type Day = { name: string; date: number; today?: boolean; load: DayLoad[] };

export function DayStrip({
  days,
  selected,
  onSelect,
  max = 120,
  mode = "view",
  origin,
  hint,
  onCancel,
}: {
  days: Day[];
  selected?: number;
  onSelect?: (i: number) => void;
  max?: number;
  mode?: "view" | "drop";
  origin?: number;
  hint?: string;
  onCancel?: () => void;
}) {
  return (
    <div>
      <div className={cx("td-strip", mode === "drop" && "td-strip-drop")} role={mode === "drop" ? "listbox" : "tablist"} aria-label={mode === "drop" ? "Choose a new day" : "Days of the week"}>
        {days.map((d, i) => {
          const total = d.load.reduce((a, b) => a + b.min, 0);
          const allDone = d.load.length > 0 && d.load.every((l) => l.done);
          return (
            <button
              key={i}
              type="button"
              role={mode === "drop" ? "option" : "tab"}
              aria-selected={i === selected}
              aria-label={`${d.name} ${d.date}${total ? `, ${total} minutes` : ", rest"}`}
              className={cx("td-day", d.today && "td-day-today", i === selected && mode !== "drop" && "td-day-selected", mode === "drop" && i === origin && "td-day-origin")}
              onClick={() => onSelect?.(i)}
            >
              <span className="td-day-name">{d.name}</span>
              <span className="td-day-date">{d.date}</span>
              {total ? (
                <span className="td-day-bars">
                  {d.load.map((l, j) => (
                    <span key={j} className={cx(`td-s-${l.sport}`, l.done ? "td-done-seg" : "td-open")} style={{ height: `${Math.max(6, Math.round((l.min / max) * 100))}%` }} />
                  ))}
                </span>
              ) : (
                <span className="td-day-rest" style={{ flex: 1, display: "grid", placeItems: "center" }}>
                  {mode === "drop" ? <Icon name="plus" size={18} /> : "Rest"}
                </span>
              )}
              {allDone ? <Icon name="check" className="td-day-check" strokeWidth={3} /> : <span style={{ height: 14 }} />}
            </button>
          );
        })}
      </div>
      {mode === "drop" && (
        <div className="td-strip-hint">
          <span className="td-label">{hint ?? "Tap a day to move it"}</span>
          <Button variant="ghost" size="sm" icon="close" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, block }: { options: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void; label: string; block?: boolean }) {
  return (
    <div className={cx("td-seg", block && "td-seg-block")} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ selected, onClick, disabled, icon, children }: { selected?: boolean; onClick?: () => void; disabled?: boolean; icon?: IconName; children: React.ReactNode }) {
  return (
    <button type="button" className="td-chip" aria-pressed={!!selected} disabled={disabled} onClick={onClick}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

function decimals(step: number) {
  return (String(step).split(".")[1] ?? "").length;
}

/** − value + ; the value itself is a field you can type into. */
export function Stepper({ value, onChange, step = 1, min = 0, unit, label, hint }: { value: number | null; onChange: (n: number | null) => void; step?: number; min?: number; unit?: string; label?: string; hint?: string }) {
  const [text, setText] = useState<string | null>(null);
  const set = (n: number) => onChange(Math.max(min, Math.round(n / step) * step));
  const shown = text ?? (value === null ? "" : value.toFixed(decimals(step)).replace(/\.0+$/, (m) => (decimals(step) ? m : "")));
  return (
    <div className="td-step">
      {label && (
        <div className="td-set-head">
          <span className="td-label td-muted">{label}</span>
          {hint && <span className="td-metric-s td-muted">{hint}</span>}
        </div>
      )}
      <div className="td-step-box" role="group" aria-label={label}>
        <button type="button" aria-label={`Decrease ${label ?? unit ?? ""}`} onClick={() => set((value ?? 0) - step)}>
          <Icon name="minus" />
        </button>
        <span className="td-step-input">
          <input
            className="td-step-val"
            inputMode="decimal"
            value={shown}
            placeholder="–"
            aria-label={label ?? unit}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setText(e.target.value);
              const n = parseFloat(e.target.value.replace(",", "."));
              onChange(Number.isFinite(n) ? n : null);
            }}
            onBlur={() => setText(null)}
          />
          {unit && <small>{unit}</small>}
        </span>
        <button type="button" aria-label={`Increase ${label ?? unit ?? ""}`} onClick={() => set((value ?? 0) + step)}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}

const RPE_WORDS = ["", "Very easy", "Easy", "Easy", "Steady", "Steady", "Hard", "Hard", "Very hard", "Very hard", "Max"];
export function RpeScale({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="td-set-head" style={{ marginBottom: 8 }}>
        <span className="td-label td-muted">Effort · RPE</span>
        <span className="td-metric-s">{value ? `${value}/10 · ${RPE_WORDS[value]}` : "Not set"}</span>
      </div>
      <div className="td-rpe" role="radiogroup" aria-label="Effort, 1 to 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={n === value} className={n < value ? "td-in" : undefined} onClick={() => onChange(n === value ? 0 : n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="td-rpe-legend td-metric-s td-muted">
        <span>Easy</span>
        <span>All out</span>
      </div>
    </div>
  );
}

const MOODS = ["Drained", "Low", "OK", "Good", "Great"];
export function MoodPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="td-set-head" style={{ marginBottom: 8 }}>
        <span className="td-label td-muted">Mood</span>
        <span className="td-metric-s">{value ? MOODS[value - 1] : "Not set"}</span>
      </div>
      <div className="td-mood" role="radiogroup" aria-label="Mood">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={MOODS[n - 1]} onClick={() => onChange(n === value ? 0 : n)}>
            <Icon name={`mood${n}` as IconName} strokeWidth={1.8} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextField({
  label,
  id,
  name,
  numeric,
  unit,
  placeholder,
  defaultValue,
  value,
  onChange,
  hint,
  error,
  multiline,
  rows = 3,
  type,
  required,
  autoComplete,
  minLength,
  mono,
}: {
  label: string;
  id?: string;
  name?: string;
  numeric?: boolean;
  unit?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: React.ReactNode;
  error?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  mono?: boolean;
}) {
  const fid = id ?? `f-${(name ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const common = {
    id: fid,
    name,
    placeholder,
    defaultValue,
    value,
    required,
    "aria-invalid": error ? true : undefined,
    onChange: onChange ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) : undefined,
  };
  return (
    <div className={cx("td-field", error && "td-field-err")}>
      <label htmlFor={fid} className="td-label td-muted">
        {label}
      </label>
      <div className="td-field-box" style={multiline ? { alignItems: "stretch" } : undefined}>
        {multiline ? (
          <textarea {...common} rows={rows} spellCheck={!mono} style={mono ? { fontFamily: "var(--font-data)", fontSize: 13, lineHeight: "20px" } : { resize: "vertical" }} />
        ) : (
          <input {...common} type={type} className={numeric ? "td-num" : undefined} inputMode={numeric ? "decimal" : undefined} autoComplete={autoComplete} minLength={minLength} />
        )}
        {unit && <span className="td-field-unit td-metric-s">{unit}</span>}
      </div>
      {(error || hint) && (
        <div className="td-field-msg">
          {error && <Icon name="alert" />}
          {error ?? hint}
        </div>
      )}
    </div>
  );
}

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Week", icon: "week" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/cycles", label: "Cycles", icon: "cycles" },
];
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="td-tabbar" aria-label="Main">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" || path.startsWith("/workout") || path.startsWith("/add") : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="td-tab" aria-current={active ? "page" : undefined}>
            <span className="td-tab-pip">
              <Icon name={t.icon} />
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Calm offline banner, shown only while the phone has no connection. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  const [since, setSince] = useState("");
  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      if (!navigator.onLine) setSince(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <Notice tone="offline" title="You're offline">
      Showing this week as of {since}. Changes need a connection.
    </Notice>
  );
}
