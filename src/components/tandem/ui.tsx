// Server-safe Tandem components (no state). Interactive ones live in ./interactive.tsx.
import Link from "next/link";
import { Icon, type IconName } from "./icon";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "lane" | "danger";
export function btnClass(variant: Variant = "primary", size?: "sm", block?: boolean) {
  return cx("td-btn", `td-btn-${variant}`, size === "sm" && "td-btn-sm", block && "td-btn-block");
}

export function Button({
  variant = "primary",
  size,
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm"; icon?: IconName; iconRight?: IconName; block?: boolean }) {
  return (
    <button type="button" {...rest} className={cx(btnClass(variant, size, block), className)}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size,
  icon,
  block,
  children,
}: { href: string; variant?: Variant; size?: "sm"; icon?: IconName; block?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={btnClass(variant, size, block)}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

export function IconLink({ href, icon, label, filled }: { href: string; icon: IconName; label: string; filled?: boolean }) {
  return (
    <Link href={href} className={cx("td-iconbtn", filled && "td-iconbtn-filled")} aria-label={label} title={label}>
      <Icon name={icon} />
    </Link>
  );
}

const TAGS: Record<string, [string, IconName | null]> = {
  moved: ["td-tag-moved", "move"],
  done: ["td-tag-done", "check"],
  missed: ["td-tag-missed", "alert"],
  skipped: ["td-tag-skipped", null],
  today: ["td-tag-today", null],
  readonly: ["td-tag-readonly", "lock"],
};
export function StatusTag({ kind, children }: { kind: keyof typeof TAGS; children: React.ReactNode }) {
  const [cls, icon] = TAGS[kind] ?? TAGS.skipped;
  return (
    <span className={cx("td-tag", cls)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** Segmented control made of links (for navigation choices like Me / Partner). */
export function SegmentedLinks({ options, value, label, block }: { options: { value: string; label: string; href: string; icon?: IconName }[]; value: string; label: string; block?: boolean }) {
  return (
    <nav className={cx("td-seg", block && "td-seg-block")} aria-label={label}>
      {options.map((o) => (
        <Link key={o.value} href={o.href} aria-current={o.value === value ? "true" : undefined}>
          {o.icon && <Icon name={o.icon} />}
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function StatTile({ label, value, unit, delta, trend }: { label: string; value: string; unit?: string; delta?: string; trend?: "up" | "down" }) {
  return (
    <div className="td-tile">
      <span className="td-label td-muted">{label}</span>
      <span className="td-tile-val">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {delta && (
        <span className={cx("td-delta td-metric-s", trend === "down" ? "td-delta-down" : "td-delta-up")}>
          <Icon name={trend === "down" ? "down" : "up"} strokeWidth={2.6} />
          {delta}
        </span>
      )}
    </div>
  );
}

export function CycleBanner({ goal, name, current, weeks, href }: { goal?: string | null; name: string; current: number; weeks: { focus: string; done?: number }[]; href?: string }) {
  const body = (
    <section className="td-cycle" aria-label="Current cycle">
      <div className="td-cycle-top">
        <div>
          <span className="td-label" style={{ opacity: 0.7 }}>{goal || "Cycle"}</span>
          <h2 className="td-cycle-name">{name}</h2>
        </div>
        <div className="td-cycle-count">
          Wk {current}
          <small> / {weeks.length}</small>
        </div>
      </div>
      <div className="td-cycle-weeks" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((w, i) => (
          <div key={i} className={cx("td-cycle-wk", i + 1 === current && "td-now")}>
            <i>
              <b style={{ width: `${Math.round((w.done ?? 0) * 100)}%` }} />
            </i>
            <span className="td-label">{w.focus}</span>
          </div>
        ))}
      </div>
    </section>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
      {body}
    </Link>
  ) : (
    body
  );
}

export function ConsistencyBars({ values, label }: { values: number[]; label?: string }) {
  return (
    <div>
      <div className="td-cons" role="img" aria-label={label ?? `Weekly completion, last ${values.length} weeks`} style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((x, i) => (
          <i key={i} className={cx(x < 0.5 && "td-low", i === values.length - 1 && "td-now")} style={{ height: `${Math.max(6, Math.round(x * 100))}%` }} />
        ))}
      </div>
      <div className="td-cons-axis td-metric-s td-muted">
        <span>{values.length} wk ago</span>
        <span>This week</span>
      </div>
    </div>
  );
}

const NOTICE_ICON: Record<string, IconName> = { offline: "offline", partner: "lock", error: "alert", info: "week", done: "trophy" };
export function Notice({ tone = "info", title, children, action, icon }: { tone?: "offline" | "partner" | "error" | "info" | "done"; title: string; children?: React.ReactNode; action?: React.ReactNode; icon?: IconName }) {
  return (
    <div className={cx("td-notice", `td-notice-${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon ?? NOTICE_ICON[tone]} />
      <div>
        <strong>{title}</strong>
        {children && <div className="t-small" style={{ color: tone === "done" ? "var(--on-lane)" : "var(--ink-muted)" }}>{children}</div>}
      </div>
      {action ?? <span />}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="td-section-label">
      <h2 className="td-label td-muted" style={{ margin: 0 }}>{children}</h2>
      {right}
    </div>
  );
}
