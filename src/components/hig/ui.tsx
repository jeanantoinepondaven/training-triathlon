"use client";
// Tandem HIG components (ported from the design system's bundle; same class names and markup).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Sport } from "@/db/schema";
import { SPORTS, Symbol } from "./symbol";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnVariant = "prominent" | "tinted" | "bordered" | "plain" | "glass" | "glassProminent";
type BtnSize = "s" | "m" | "l" | "xl";
const btnCls = (variant: BtnVariant, size: BtnSize, destructive?: boolean, full?: boolean, extra?: string) =>
  cx("hig-btn hig-hit", `v-${variant}`, `sz-${size}`, destructive && "is-destructive", full && "is-full", extra);

export function Button({
  variant = "bordered",
  size = "m",
  icon,
  destructive,
  full,
  children,
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "role"> & { variant?: BtnVariant; size?: BtnSize; icon?: string; destructive?: boolean; full?: boolean }) {
  return (
    <button type="button" {...rest} className={btnCls(variant, size, destructive, full, className)}>
      {icon && <Symbol name={icon} size={size === "s" ? 15 : 18} weight="semibold" />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export function ButtonLink({ href, variant = "bordered", size = "m", icon, full, children }: { href: string; variant?: BtnVariant; size?: BtnSize; icon?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={btnCls(variant, size, false, full)}>
      {icon && <Symbol name={icon} size={size === "s" ? 15 : 18} weight="semibold" />}
      <span>{children}</span>
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  variant = "glass",
  size = "l",
  href,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  variant?: "glass" | "glassProminent" | "plain" | "bordered" | "tinted";
  size?: "s" | "m" | "l";
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}) {
  const cls = cx("hig-ib hig-hit", `v-${variant}`, `sz-${size}`);
  const sym = <Symbol name={icon} size={size === "s" ? 16 : size === "m" ? 18 : 20} weight="semibold" />;
  if (href)
    return (
      <Link href={href} className={cls} aria-label={label} title={label}>
        {sym}
      </Link>
    );
  return (
    <button type="button" className={cls} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {sym}
    </button>
  );
}

export type GroupItem = { icon: string; label: string; href?: string; onClick?: () => void; hidden?: boolean };
export function GlassGroup({ items, label }: { items: GroupItem[]; label: string }) {
  const shown = items.filter((i) => !i.hidden);
  if (!shown.length) return null;
  return (
    <div className="hig-group hig-glass" role="group" aria-label={label}>
      {shown.map((it) =>
        it.href ? (
          <Link key={it.icon} href={it.href} className="hig-group-ib hig-hit" aria-label={it.label} title={it.label}>
            <Symbol name={it.icon} size={20} weight="semibold" />
          </Link>
        ) : (
          <button key={it.icon} type="button" className="hig-group-ib hig-hit" aria-label={it.label} title={it.label} onClick={it.onClick}>
            <Symbol name={it.icon} size={20} weight="semibold" />
          </button>
        ),
      )}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size,
  full,
  label,
}: {
  options: { value: T; label: string; icon?: string; href?: string }[];
  value: T;
  onChange?: (v: T) => void;
  size?: "s" | "m";
  full?: boolean;
  label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={cx("hig-seg", size === "s" && "sz-s", full && "is-full")} role="radiogroup" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: idx }}>
      <span className="hig-seg-thumb" aria-hidden="true" />
      {options.map((o) => {
        const on = o.value === value;
        const inner = (
          <>
            {o.icon && <Symbol name={o.icon} size={15} weight="semibold" />}
            {o.label}
          </>
        );
        return o.href ? (
          <Link key={o.value} href={o.href} role="radio" aria-checked={on} className="hig-hit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 14px", font: on ? "600 15px/20px var(--font-text)" : "500 15px/20px var(--font-text)", letterSpacing: "-0.23px", whiteSpace: "nowrap" }}>
            {inner}
          </Link>
        ) : (
          <button key={o.value} type="button" role="radio" aria-checked={on} className="hig-hit" onClick={() => onChange?.(o.value)}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({ sport, icon, selected, onClick, children }: { sport?: Sport; icon?: string; selected?: boolean; onClick?: () => void; children?: React.ReactNode }) {
  const ic = sport ? SPORTS[sport].icon : icon;
  return (
    <button type="button" className={cx("hig-pill hig-hit", selected && "is-selected", sport && `s-${sport}`)} aria-pressed={!!selected} onClick={onClick}>
      {ic && <Symbol name={ic} size={15} weight="semibold" />}
      {children ?? (sport ? SPORTS[sport].label : null)}
    </button>
  );
}

export function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  suffix,
  inputMode,
  type = "text",
  readOnly,
  autoComplete = "off",
  name,
  error,
  required,
}: {
  id: string;
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric" | "text" | "email";
  type?: string;
  readOnly?: boolean;
  autoComplete?: string;
  name?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className={cx("hig-field", error && "is-error")}>
      <label htmlFor={id}>{label}</label>
      <div className="hig-field-in">
        <input id={id} name={name} value={value ?? ""} placeholder={placeholder} inputMode={inputMode} type={type} readOnly={readOnly} autoComplete={autoComplete} required={required} aria-invalid={!!error} onChange={(e) => onChange?.(e.target.value)} />
        {suffix && <span className="sfx">{suffix}</span>}
      </div>
      {error && (
        <div className="hig-field-err">
          <Symbol name="exclamationmark.circle" size={14} />
          {error}
        </div>
      )}
    </div>
  );
}

export function Stepper({ label, value, onChange, step = 1, min = 0, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; suffix?: string }) {
  const dec = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  const bump = (d: number) => onChange(Math.max(min, +(value + d * step).toFixed(dec)));
  return (
    <div className="hig-stepper">
      <div className="hig-stepper-val">
        <small>{label}</small>
        <b>
          {value.toFixed(dec)}
          {suffix && <i>{suffix}</i>}
        </b>
      </div>
      <div className="hig-stepper-ctl" role="group" aria-label={label}>
        <button type="button" className="hig-hit" aria-label={`Decrease ${label}`} onClick={() => bump(-1)}>
          <Symbol name="minus" size={18} weight="semibold" />
        </button>
        <span className="div" aria-hidden="true" />
        <button type="button" className="hig-hit" aria-label={`Increase ${label}`} onClick={() => bump(1)}>
          <Symbol name="plus" size={18} weight="semibold" />
        </button>
      </div>
    </div>
  );
}

export function CheckButton({ checked, onChange, readOnly, size, label }: { checked: boolean; onChange?: (v: boolean) => void; readOnly?: boolean; size?: "s" | "m"; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? "Mark done"}
      aria-readonly={readOnly || undefined}
      className={cx("hig-check", checked && "is-on", readOnly && "is-readonly", size === "s" && "sz-s")}
      onClick={(e) => {
        e.stopPropagation();
        if (readOnly) return;
        if (!checked && typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {}
        }
        onChange?.(!checked);
      }}
    >
      <span className="ring">
        <Symbol name="checkmark" size={size === "s" ? 13 : 15} weight="bold" />
      </span>
    </button>
  );
}

export function Toggle({ label, sub, checked, onChange, disabled }: { label: React.ReactNode; sub?: React.ReactNode; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="hig-toggle" style={{ opacity: disabled ? 0.5 : 1, minHeight: sub ? 58 : undefined }}>
      <span className="hig-row-text">
        <span className="title">{label}</span>
        {sub && <span className="sub">{sub}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={typeof label === "string" ? label : undefined} disabled={disabled} className="hig-toggle-track hig-hit" onClick={() => onChange?.(!checked)}>
        <i />
      </button>
    </div>
  );
}

const RPE_WORDS = ["", "Very easy", "Easy", "Easy", "Moderate", "Moderate", "Hard", "Hard", "Very hard", "Very hard", "Max"];
export function RpeSlider({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const pct = value ? ((value - 1) / 9) * 100 : 0;
  return (
    <div className="hig-rpe">
      <div className="hig-rpe-head">
        <span>Effort</span>
        <b>{value ? `${value} · ${RPE_WORDS[value]}` : "Not set"}</b>
      </div>
      <div className="hig-rpe-track" role="group" aria-label="Effort, 1 to 10" style={{ ["--pct" as string]: `${pct}%` }}>
        <span className="rail">
          <i />
        </span>
        {value ? <span className="knob" aria-hidden="true" /> : null}
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={cx("stop", n <= value && "is-on")} aria-label={`Effort ${n}`} aria-pressed={n === value} onClick={() => onChange?.(n === value ? 0 : n)}>
            <span>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const MOODS = ["Awful", "Low", "Okay", "Good", "Great"];
export function MoodPicker({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="hig-mood" role="radiogroup" aria-label="Mood">
      {MOODS.map((m, i) => {
        const on = value === i + 1;
        return (
          <button key={m} type="button" role="radio" aria-checked={on} className={cx("hig-hit", on && "is-on")} onClick={() => onChange?.(on ? 0 : i + 1)}>
            <Symbol name={`face.${i + 1}`} size={26} />
            <span>{m}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ListSection({ header, headerTrailing, footer, padded, plain, children, id }: { header?: React.ReactNode; headerTrailing?: React.ReactNode; footer?: React.ReactNode; padded?: boolean; plain?: boolean; children?: React.ReactNode; id?: string }) {
  return (
    <section className="hig-section" id={id}>
      {(header || headerTrailing) && (
        <div className="hig-section-head">
          <h3>{header}</h3>
          {headerTrailing && <span>{headerTrailing}</span>}
        </div>
      )}
      <div className={cx("hig-section-body", plain && "is-plain", padded && "is-padded")}>{children}</div>
      {footer && <div className="hig-section-foot">{footer}</div>}
    </section>
  );
}

export function ListRow({
  leading,
  title,
  subtitle,
  detail,
  trailing,
  chevron,
  onClick,
  href,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  href?: string;
}) {
  const cls = cx("hig-row", !!subtitle && "two", !!leading && "has-leading", !!(onClick || href) && "is-tappable");
  const inner = (
    <>
      {leading}
      <div className="hig-row-text">
        <span className="title">{title}</span>
        {subtitle && <span className="sub">{subtitle}</span>}
      </div>
      {detail != null && <span className="detail">{detail}</span>}
      {trailing}
      {chevron && <Symbol name="chevron.right" size={14} weight="semibold" className="chev" />}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  return (
    <div className={cls} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {inner}
    </div>
  );
}

export function SportIcon({ sport, size = "m", tag, muted, children }: { sport: Sport; size?: "s" | "m" | "l"; tag?: boolean; muted?: boolean; children?: React.ReactNode }) {
  const s = SPORTS[sport] ?? SPORTS.other;
  if (tag)
    return (
      <span className={cx("hig-sporttag", `s-${sport}`)}>
        <Symbol name={s.icon} size={14} weight="semibold" />
        {children ?? s.label}
      </span>
    );
  return (
    <span className={cx("hig-sporticon", `s-${sport}`, `sz-${size}`, muted && "is-muted")} role="img" aria-label={s.label}>
      <Symbol name={s.icon} size={size === "s" ? 16 : size === "l" ? 24 : 20} weight="semibold" />
    </span>
  );
}

export function Tag({ kind, icon, children }: { kind: "moved" | "skipped" | "missed" | "done"; icon?: string; children: React.ReactNode }) {
  return (
    <span className={`hig-tag t-${kind}`}>
      {icon && <Symbol name={icon} size={13} weight="semibold" />}
      {children}
    </span>
  );
}

export type StripDay = { label: string; date: string; today?: boolean; load: { sport: Sport; minutes: number; done?: boolean }[] };
export function WeekStrip({ days, maxMinutes = 140, selected, onSelect, moveMode, from }: { days: StripDay[]; maxMinutes?: number; selected?: number | null; onSelect?: (i: number) => void; moveMode?: boolean; from?: number }) {
  return (
    <div className={cx("hig-week", moveMode && "is-move")} role="group" aria-label={moveMode ? "Pick a day" : "Days of the week"}>
      {days.map((d, i) => {
        const mins = d.load.reduce((a, l) => a + l.minutes, 0);
        const allDone = d.load.length > 0 && d.load.every((l) => l.done);
        const isTarget = moveMode && i !== from;
        return (
          <button
            key={i}
            type="button"
            className={cx("hig-day", d.today && "is-today", selected === i && "is-selected", isTarget && "is-target", moveMode && i === from && "is-source")}
            aria-pressed={selected === i}
            aria-label={`${d.label} ${d.date}${d.today ? ", today" : ""}${d.load.length ? `, ${d.load.length} session${d.load.length > 1 ? "s" : ""}, ${mins} min` : ", rest"}`}
            onClick={() => onSelect?.(i)}
          >
            <span className="dow">{d.label.charAt(0)}</span>
            <span className="num">{d.date}</span>
            <span className="load" aria-hidden="true">
              {d.load.length ? (
                d.load.map((l, j) => <i key={j} className={cx(`s-${l.sport}`, l.done && "is-done")} style={{ height: Math.max(5, Math.round((l.minutes / maxMinutes) * 40)) }} />)
              ) : (
                <i className="rest" />
              )}
            </span>
            <span className="foot">
              {allDone ? <Symbol name="checkmark.circle.fill" size={14} className="ok" /> : mins ? (mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? String(mins % 60).padStart(2, "0") : ""}` : `${mins}′`) : "–"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SetRow({ index, reps, kg, last, done, onToggle, active, readOnly, onSelect }: { index: number; reps: number; kg: number; last?: string; done: boolean; onToggle?: (v: boolean) => void; active?: boolean; readOnly?: boolean; onSelect?: () => void }) {
  return (
    <div className={cx("hig-set", done && "is-done", active && "is-active")} onClick={onSelect}>
      <span className="idx">{index}</span>
      <span className="val">
        {reps}
        <span className="x">×</span>
        {kg}
        <small>kg</small>
      </span>
      <span className="last">{last ? `Last ${last}` : ""}</span>
      <CheckButton checked={done} onChange={onToggle} readOnly={readOnly} size="s" label={`Set ${index} done`} />
    </div>
  );
}

export function StatTile({ label, value, unit, icon, delta, down }: { label: string; value: string; unit?: string; icon?: string; delta?: string; down?: boolean }) {
  return (
    <div className="hig-stat">
      <span className="lbl">
        {icon && <Symbol name={icon} size={14} weight="semibold" />}
        {label}
      </span>
      <span className="val">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {delta && (
        <span className={cx("delta", down && "is-down")}>
          <Symbol name={down ? "arrow.down.right" : "arrow.up.right"} size={13} weight="bold" />
          {delta}
        </span>
      )}
    </div>
  );
}

export function IntervalSteps({ steps, sport = "run" }: { steps: { reps?: string; what: string; target?: string; kind?: "work" }[]; sport?: Sport }) {
  return (
    <div className="hig-steps" style={{ ["--run" as string]: `var(--${sport})` }}>
      {steps.map((s, i) => (
        <div key={i} className={cx("st", s.kind === "work" ? "is-work" : "is-easy")}>
          <span className="bar" />
          <span className="reps">{s.reps ?? ""}</span>
          <span className="what">{s.what}</span>
          <span className="tgt">{s.target ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressView({ value, thin }: { value: number; thin?: boolean }) {
  return (
    <div className={cx("hig-progress", thin && "is-thin")} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span>
        <i style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
    </div>
  );
}

export function CycleHeader({ name, week, progress, focus }: { name: string; week: number; progress: number; focus: string[] }) {
  return (
    <div className="hig-cycle">
      <div className="hig-cycle-top">
        <b>{name}</b>
        <span>
          Week {week} of {focus.length}
        </span>
      </div>
      <div className="hig-cycle-weeks" style={{ gridTemplateColumns: `repeat(${focus.length}, 1fr)` }}>
        {focus.map((f, i) => (
          <div key={i} className={i + 1 === week ? "is-now" : ""}>
            <ProgressView value={i + 1 < week ? 1 : i + 1 === week ? progress : 0} thin />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Notice({ message, icon, tone, action, onAction }: { message: string; icon?: string; tone?: "offline" | "done"; action?: string; onAction?: () => void }) {
  return (
    <div className={cx("hig-notice hig-glass", tone && `t-${tone}`)} role="status">
      {icon && <Symbol name={icon} size={17} weight="semibold" />}
      <span className="msg">{message}</span>
      {action && (
        <button type="button" className="act hig-hit" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Sheet({
  title,
  subtitle,
  onClose,
  onDone,
  doneLabel = "Done",
  doneDisabled,
  dim = true,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onDone?: () => void;
  doneLabel?: string;
  doneDisabled?: boolean;
  dim?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className={cx("layer hig-sheet-wrap", dim && "is-dimmed")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="hig-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="grabber" aria-hidden="true" />
        <div className="hig-sheet-bar">
          <IconButton icon="xmark" label="Close" size="m" onClick={onClose} />
          <div className="hig-sheet-title">
            <b>{title}</b>
            {subtitle && <span>{subtitle}</span>}
          </div>
          {onDone ? <IconButton icon="checkmark" label={doneLabel} size="m" variant="glassProminent" disabled={doneDisabled} onClick={onDone} /> : <span style={{ width: 36 }} />}
        </div>
        <div className="hig-sheet-body">{children}</div>
      </section>
    </div>
  );
}

export type MenuItem = { label: string; icon?: string; destructive?: boolean; onClick?: () => void } | { divider: true };
export function MenuLayer({ items, y, label, onClose }: { items: MenuItem[]; y: number; label: string; onClose: () => void }) {
  return (
    <div className="layer menu-layer" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <div className="hig-menu hig-glass" role="menu" aria-label={label} style={{ top: Math.max(60, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 300)), right: "max(16px, calc((100vw - 680px) / 2 + 16px))" }} onClick={(e) => e.stopPropagation()}>
        {items.map((it, i) =>
          "divider" in it ? (
            <span key={`d${i}`} className="hig-menu-div" role="separator" />
          ) : (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={cx(it.destructive && "is-destructive")}
              onClick={() => {
                onClose();
                it.onClick?.();
              }}
            >
              <span>{it.label}</span>
              {it.icon && <Symbol name={it.icon} size={18} />}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

const TABS = [
  { href: "/", icon: "calendar", label: "Week" },
  { href: "/progress", icon: "chart.line.uptrend.xyaxis", label: "Progress" },
  { href: "/cycles", icon: "square.stack", label: "Cycles" },
];
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="hig-tabbar hig-glass" aria-label="Main">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={cx(on && "is-on")} aria-current={on ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, borderRadius: "var(--radius-capsule)", color: on ? "var(--tint-ink)" : "var(--label)", background: on ? "var(--fill-secondary)" : "transparent", padding: "0 10px" }}>
            <Symbol name={t.icon} size={22} weight={on ? "semibold" : undefined} />
            <span style={{ font: `${on ? 600 : 500} 11px/13px var(--font-text)`, letterSpacing: ".06px" }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Large-title screen scaffold: the title collapses into the glass toolbar on scroll. */
export function Screen({
  title,
  subtitle,
  inlineTitle,
  inlineSub,
  large = true,
  leading,
  trailing,
  bodyClass,
  floating,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  inlineTitle?: string;
  inlineSub?: string;
  large?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  bodyClass?: string;
  floating?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > (large ? 46 : 4));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [large]);
  return (
    <div className="page">
      <div className="content">
        {large && (
          <div className="hig-nav-large lt">
            <h1>{title}</h1>
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
        <div className={cx("hig-body", bodyClass)} style={large ? undefined : { paddingTop: 8 }}>
          {children}
        </div>
      </div>
      <div className="edge-top" />
      <div className="edge-bottom" />
      <header className={cx("toolbar", (scrolled || !large) && "show-inline")}>
        <div className="tb-lead">{leading}</div>
        <div className="hig-nav-inline" aria-hidden={large && !scrolled ? true : undefined}>
          <b>{inlineTitle ?? title}</b>
          {inlineSub && <span>{inlineSub}</span>}
        </div>
        <div className="hig-nav-trail">{trailing}</div>
      </header>
      {floating && <div className="float-bottom">{floating}</div>}
    </div>
  );
}
