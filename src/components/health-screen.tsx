"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Symbol } from "@/components/hig/symbol";
import { Button, ButtonLink, IconButton, ListRow, ListSection, Screen, SegmentedControl, StatTile, TabBar, Toggle } from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";
import { TrendChart } from "@/components/hig/trend-chart";
import { saveCheckIn, setShareHealth } from "@/app/actions/health";
import { autoSync, syncNow } from "@/app/actions/intervals";
import { CHECKIN, baseline, fmtSleep, formZone, latest, readiness, rolling, type CheckInKey, type HealthDay, type Readiness } from "@/lib/health";
import { addDays, formatDay } from "@/lib/dates";

type Person = { id: string; name: string };

const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
const r0 = (v: number) => String(Math.round(v));

export function ReadinessCard({ r, href, sub }: { r: Readiness; href?: string; sub?: string }) {
  const icon = r.tone === "good" ? "checkmark" : "exclamationmark.circle";
  const body = (
    <>
      <div className="ready-top">
        <span className="ready-ic" aria-hidden="true">
          <Symbol name={icon} size={20} weight="bold" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{r.title}</b>
          {sub && <span>{sub}</span>}
        </div>
        {href && <Symbol name="chevron.right" size={14} weight="semibold" style={{ color: "var(--label-tertiary)" }} />}
      </div>
      {r.reasons.length > 0 && (
        <ul>
          {r.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {r.hint && <div className="hint">{r.hint}</div>}
    </>
  );
  const cls = `ready t-${r.tone}`;
  return href ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls} role="status">
      {body}
    </div>
  );
}

export function HealthScreen({
  today,
  days,
  range,
  rangeDays,
  mine,
  viewed,
  meId,
  partner,
  partnerShares,
  share,
  connected,
  lastSync,
  races,
}: {
  today: string;
  days: HealthDay[];
  range: "4w" | "12w" | "6m";
  rangeDays: number;
  mine: boolean;
  viewed: Person;
  meId: string;
  partner: Person | null;
  partnerShares: boolean;
  share: boolean;
  connected: boolean;
  lastSync: string | null;
  races: { date: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const todayRow = days.find((d) => d.date === today);
  const [ci, setCi] = useState<Partial<Record<CheckInKey, number | null>>>(() => Object.fromEntries(CHECKIN.map(({ key }) => [key, todayRow?.[key] ?? null])));
  const [shareOn, setShareOn] = useState(share);

  // Pull fresh Garmin data when the page opens (throttled server-side).
  useEffect(() => {
    if (!mine || !connected) return;
    let alive = true;
    autoSync().then((r) => alive && r.health + r.matched + r.added > 0 && router.refresh());
    return () => {
      alive = false;
    };
  }, [mine, connected, router]);

  const from = addDays(today, -(rangeDays - 1));
  const dates = Array.from({ length: rangeDays }, (_, i) => addDays(from, i));
  const by = new Map(days.map((d) => [d.date, d]));
  const col = (k: keyof HealthDay) => dates.map((d) => {
    const v = by.get(d)?.[k];
    return typeof v === "number" ? v : null;
  });

  const r = readiness(days, today);
  const hrvB = baseline(days, "hrv", today);
  const rhrB = baseline(days, "restingHR", today);
  const tile = (key: "hrv" | "restingHR" | "sleepSecs" | "weight", fmt: (v: number) => string) => {
    const l = latest(days, key, today, key === "weight" ? 14 : 2);
    const b = baseline(days, key, today);
    return { v: l ? fmt(l.v) : "–", delta: l && b ? l.v - b.mean : null, old: l && l.date !== today };
  };
  const hrv = tile("hrv", r0);
  const rhr = tile("restingHR", r0);
  const sleep = tile("sleepSecs", fmtSleep);
  const ctl = latest(days, "ctl", today, 3);
  const atl = latest(days, "atl", today, 3);
  const form = ctl && atl ? ctl.v - atl.v : null;
  const zone = form != null ? formZone(form) : null;

  const hrvRaw = col("hrv");
  const hrv7 = rolling(dates.map((d, i) => ({ date: d, v: hrvRaw[i] })), 7).map((p) => p.v);
  const ctlS = col("ctl");
  const atlS = col("atl");
  const formS = ctlS.map((c, i) => (c != null && atlS[i] != null ? c - atlS[i]! : null));
  const marks = races.filter((x) => x.date >= from && x.date <= today);
  const has = (s: (number | null)[]) => s.some((v) => v != null);

  const body = (key: "weight" | "bodyFat" | "vo2max" | "steps" | "spO2" | "respiration" | "avgSleepingHR" | "sleepScore", label: string, fmt: (v: number) => string, unit: string, avg7 = false) => {
    let val: number | null = null;
    if (avg7) {
      const w = days.filter((d) => d.date > addDays(today, -7) && d[key] != null).map((d) => d[key] as number);
      val = w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
    } else val = latest(days, key, today, 30)?.v ?? null;
    if (val == null) return null;
    const old = days.find((d) => d.date >= from && d[key] != null)?.[key] as number | undefined;
    const ch = !avg7 && old != null && old !== val ? val - old : null;
    return <ListRow key={key} title={label} subtitle={ch != null ? `${ch > 0 ? "+" : "−"}${fmt(Math.abs(ch))} ${unit} over ${range}` : avg7 ? "7-day average" : undefined} detail={`${fmt(val)} ${unit}`.trim()} />;
  };
  const bodyRows = [
    body("weight", "Weight", r1, "kg"),
    body("bodyFat", "Body fat", r1, "%"),
    body("vo2max", "VO2max", r0, ""),
    body("steps", "Steps", (v) => Math.round(v).toLocaleString("en"), "", true),
    body("avgSleepingHR", "Heart rate asleep", r0, "bpm", true),
    body("sleepScore", "Sleep score", r0, "", true),
    body("spO2", "Blood oxygen", r0, "%", true),
    body("respiration", "Breathing rate", r1, "/min", true),
  ].filter(Boolean);

  const dirty = CHECKIN.some(({ key }) => (ci[key] ?? null) !== (todayRow?.[key] ?? null));
  const q = (rr: string) => `/health?r=${rr}${mine ? "" : `&u=${viewed.id}`}`;

  return (
    <Screen
      title="Health"
      subtitle={`${formatDay(today, { weekday: "long", day: "numeric", month: "long" })}${mine ? "" : ` · ${viewed.name}`}`}
      leading={<IconButton icon="chevron.left" label="Home" href="/" />}
      trailing={
        mine && connected ? (
          <IconButton
            icon="arrow.triangle.2.circlepath"
            label="Sync from Garmin"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const s = await syncNow();
                toast(s.error ? { message: s.error, icon: "exclamationmark.circle" } : { message: `Synced · ${s.health ?? 0} days of health data`, icon: "applewatch", tone: "done" });
                router.refresh();
              })
            }
          />
        ) : undefined
      }
      floating={
        <>
          <ToastSlot />
          <TabBar />
        </>
      }
    >
      {partner && partnerShares && (
        <SegmentedControl
          label="Whose health"
          full
          value={viewed.id}
          options={[
            { value: meId, label: "Me", href: `/health?r=${range}` },
            { value: partner.id, label: partner.name, href: `/health?r=${range}&u=${partner.id}` },
          ]}
        />
      )}

      {!connected && mine && (
        <ListSection footer="Garmin sends HRV, resting heart rate, sleep and weight to intervals.icu, and Tandem reads them from there. The check-in below works without it.">
          <ListRow leading={<Symbol name="applewatch" size={20} weight="semibold" style={{ color: "var(--tint-ink)" }} />} title="Connect Garmin" subtitle="via intervals.icu" chevron href="/settings/garmin" />
        </ListSection>
      )}

      <ReadinessCard r={r} sub={mine ? "Today" : `${viewed.name} today`} />

      <div className="h-tiles">
        <StatTile label="HRV" value={hrv.v} unit="ms" delta={hrv.delta != null ? `${Math.abs(Math.round(hrv.delta))} vs normal` : undefined} down={hrv.delta != null && hrv.delta < 0} />
        <StatTile label="Resting HR" value={rhr.v} unit="bpm" delta={rhr.delta != null ? `${Math.abs(Math.round(rhr.delta))} vs normal` : undefined} down={rhr.delta != null && rhr.delta < 0} bad={rhr.delta != null && rhr.delta > 0} />
        <StatTile label="Sleep" value={sleep.v} delta={sleep.delta != null ? `${Math.abs(Math.round(sleep.delta / 60))} min vs normal` : undefined} down={sleep.delta != null && sleep.delta < 0} />
        <StatTile label="Form" value={form != null ? (form > 0 ? `+${Math.round(form)}` : String(Math.round(form))) : "–"} delta={zone?.label.split(":")[0]} plain bad={zone?.tone === "serious" || zone?.tone === "warning"} />
      </div>

      {mine && (
        <ListSection header="Morning check-in" headerTrailing={todayRow && CHECKIN.some(({ key }) => todayRow[key]) ? "Saved today" : "10 seconds"} footer={connected ? "Also saved to intervals.icu." : undefined}>
          {CHECKIN.map(({ key, label, opts }) => (
            <div key={key} className="ci-row">
              <span>{label}</span>
              <SegmentedControl
                size="s"
                full
                label={label}
                value={String(ci[key] ?? 0)}
                onChange={(v) => setCi((o) => ({ ...o, [key]: o[key] === Number(v) ? null : Number(v) }))}
                options={opts.map((o, i) => ({ value: String(i + 1), label: o }))}
              />
            </div>
          ))}
          <div style={{ padding: "4px var(--space-4) 12px" }}>
            <Button
              variant="prominent"
              size="l"
              full
              icon="checkmark"
              disabled={!dirty || busy}
              onClick={() =>
                start(async () => {
                  const res = await saveCheckIn(ci);
                  toast(res.error ? { message: res.error, icon: "exclamationmark.circle" } : { message: "Check-in saved", icon: "checkmark", tone: "done" });
                  router.refresh();
                })
              }
            >
              Save check-in
            </Button>
          </div>
        </ListSection>
      )}

      <SegmentedControl
        label="Range"
        full
        value={range}
        options={[
          { value: "4w", label: "4 weeks", href: q("4w") },
          { value: "12w", label: "12 weeks", href: q("12w") },
          { value: "6m", label: "6 months", href: q("6m") },
        ]}
      />

      <ListSection padded footer={zone ? `${zone.label}. Form is fitness minus fatigue; aim for +5 to +25 on race day.` : "Fitness and fatigue come from intervals.icu once activities sync."}>
        <div>
          <div className="chart-head">
            <b>Fitness and fatigue</b>
            <span>Training load</span>
          </div>
          <TrendChart
            label="Fitness and fatigue over time"
            dates={dates}
            fmt={r0}
            marks={marks}
            series={[
              { name: "Fitness", values: ctlS },
              { name: "Fatigue", values: atlS, kind: "dash" },
            ]}
          />
          {has(formS) && (
            <>
              <div className="chart-head" style={{ marginTop: 14 }}>
                <b>Form</b>
                <span>{form != null ? `${form > 0 ? "+" : ""}${Math.round(form)} today` : ""}</span>
              </div>
              <TrendChart label="Form over time: above zero is fresh, below zero is building" dates={dates} fmt={r0} height={80} zero series={[{ name: "Form", values: formS, kind: "bars" }]} />
            </>
          )}
        </div>
      </ListSection>

      <ListSection padded footer={hrvB ? `Shaded: your normal range (28-day average ± 1 SD, ${Math.round(hrvB.mean - hrvB.sd)}–${Math.round(hrvB.mean + hrvB.sd)} ms). Dots are nightly readings.` : undefined}>
        <div>
          <div className="chart-head">
            <b>HRV</b>
            <span>ms · 7-day average</span>
          </div>
          <TrendChart
            label="Heart rate variability over time"
            dates={dates}
            fmt={r0}
            marks={marks}
            band={hrvB ? { lo: hrvB.mean - hrvB.sd, hi: hrvB.mean + hrvB.sd } : null}
            series={[
              { name: "7-day", values: hrv7 },
              { name: "Night", values: hrvRaw, kind: "dots" },
            ]}
          />
        </div>
      </ListSection>

      <ListSection padded footer={rhrB ? `Your normal: ${Math.round(rhrB.mean)} bpm. A few beats higher for days often means fatigue or illness.` : undefined}>
        <div>
          <div className="chart-head">
            <b>Resting heart rate</b>
            <span>bpm</span>
          </div>
          <TrendChart label="Resting heart rate over time" dates={dates} fmt={r0} marks={marks} series={[{ name: "Resting HR", values: col("restingHR") }]} />
        </div>
      </ListSection>

      <ListSection padded>
        <div>
          <div className="chart-head">
            <b>Sleep</b>
            <span>hours</span>
          </div>
          <TrendChart label="Sleep per night" dates={dates} fmt={(v) => fmtSleep(v * 3600).replace(" h ", ":")} series={[{ name: "Sleep", values: col("sleepSecs").map((v) => (v == null ? null : v / 3600)) }]} />
        </div>
      </ListSection>

      {has(col("weight")) && (
        <ListSection padded>
          <div>
            <div className="chart-head">
              <b>Weight</b>
              <span>kg</span>
            </div>
            <TrendChart label="Body weight over time" dates={dates} fmt={r1} marks={marks} series={[{ name: "Weight", values: col("weight") }]} />
          </div>
        </ListSection>
      )}

      {bodyRows.length > 0 && <ListSection header="Body">{bodyRows}</ListSection>}

      {mine && partner && (
        <ListSection footer={`Training plans are always shared. Health stays private unless you turn this on.`}>
          <Toggle
            label={`Share health with ${partner.name}`}
            checked={shareOn}
            onChange={(v) => {
              setShareOn(v);
              start(() => setShareHealth(v));
            }}
          />
        </ListSection>
      )}
      {mine && !connected && (
        <ButtonLink href="/settings/garmin" variant="tinted" size="l" full icon="applewatch">
          Connect Garmin
        </ButtonLink>
      )}
      <div className="attr">
        Health data from Garmin via intervals.icu
        {lastSync ? ` · synced ${formatDay(lastSync.slice(0, 10), { day: "numeric", month: "short" })} ${lastSync.slice(11, 16)} UTC` : ""}
      </div>
    </Screen>
  );
}
