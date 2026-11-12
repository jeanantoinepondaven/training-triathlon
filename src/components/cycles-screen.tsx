"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteCycle } from "@/app/actions/cycles";
import { logout } from "@/app/actions/auth";
import { Symbol } from "@/components/hig/symbol";
import { Button, CycleHeader, IconButton, ListRow, ListSection, MenuLayer, type MenuItem, Screen, SegmentedControl, TabBar } from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";

export type CycleItem = { id: string; name: string; goal: string | null; start: string; end: string; dates: string; pct: number; weeks: number; focus: string[] };

export function CyclesScreen({ current, currentWeek, currentProgress, upcoming, finished, userName, garmin }: { current: CycleItem | null; currentWeek: number; currentProgress: number; upcoming: CycleItem[]; finished: CycleItem[]; userName: string; garmin: { connected: boolean; name: string | null } }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [menu, setMenu] = useState<{ items: MenuItem[]; y: number; label: string } | null>(null);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">("auto");
  useEffect(() => {
    try {
      // Read the saved choice after mount (localStorage isn't available during server render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme((localStorage.getItem("theme") as "light" | "dark") || "auto");
    } catch {}
  }, []);
  const applyTheme = (t: "auto" | "light" | "dark") => {
    setTheme(t);
    try {
      if (t === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };
  const cycleMenu = (c: CycleItem, y: number) =>
    setMenu({
      y,
      label: c.name,
      items: [
        { label: "Open week 1", icon: "calendar", onClick: () => router.push(`/week?w=${c.start}`) },
        { divider: true },
        {
          label: "Delete cycle and its sessions",
          icon: "trash",
          destructive: true,
          onClick: () => {
            if (!confirm(`Delete “${c.name}” and all its sessions, including logs?`)) return;
            start(async () => {
              await deleteCycle(c.id);
              toast({ message: `${c.name} deleted`, icon: "trash" });
            });
          },
        },
      ],
    });
  const row = (c: CycleItem, state: "upcoming" | "finished") => (
    <ListRow key={c.id} title={c.name} subtitle={`${c.dates}${c.goal ? ` · ${c.goal}` : ""}`} detail={state === "upcoming" ? "Upcoming" : `${c.pct}%`} chevron onClick={(e) => cycleMenu(c, e.currentTarget.getBoundingClientRect().bottom - 4)} />
  );
  const count = (current ? 1 : 0) + upcoming.length + finished.length;

  return (
    <>
      <Screen
        title="Cycles"
        subtitle={`${count} training block${count === 1 ? "" : "s"} · 3 load weeks + 1 easy`}
        trailing={<IconButton icon="square.and.arrow.down" label="Import cycle" variant="glassProminent" href="/cycles/new" />}
        floating={
          <>
            <ToastSlot />
            <TabBar />
          </>
        }
      >
        {current && (
          <ListSection header="Current" headerTrailing={current.dates}>
            <div className="cyc-card" role="button" tabIndex={0} onClick={() => router.push("/week")}>
              <CycleHeader name={current.name} week={currentWeek} progress={currentProgress} focus={current.focus} />
              <div className="cyc-foot">
                <span>{current.goal}</span>
                <span>{current.pct}% done so far</span>
              </div>
            </div>
          </ListSection>
        )}
        {upcoming.length > 0 && <ListSection header="Upcoming">{upcoming.map((c) => row(c, "upcoming"))}</ListSection>}
        {finished.length > 0 && (
          <ListSection header="Finished" footer="Completion counts your own sessions. Skipped sessions don’t count against you.">
            {finished.map((c) => row(c, "finished"))}
          </ListSection>
        )}
        {count === 0 && (
          <div className="empty">
            <h2>No cycles yet</h2>
            <p>Import your first block to fill your weeks.</p>
          </div>
        )}
        <Button variant={count ? "tinted" : "prominent"} size="l" full icon="square.and.arrow.down" onClick={() => router.push("/cycles/new")}>
          Import next cycle
        </Button>
        <ListSection header="Settings">
          <ListRow
            href="/settings/garmin"
            leading={<span className="hig-sporticon sz-s s-other"><Symbol name="applewatch" size={16} weight="semibold" /></span>}
            title="Garmin"
            subtitle={garmin.connected ? `Connected via intervals.icu · ${garmin.name ?? ""}` : "Not connected"}
            chevron
          />
          <div className="side-theme" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "0 12px 0 16px" }}>
            <span>Appearance</span>
            <SegmentedControl<"auto" | "light" | "dark">
              size="s"
              label="Appearance"
              value={theme}
              onChange={applyTheme}
              options={[
                { value: "auto", label: "Auto" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
          <form action={logout}>
            <button type="submit" className="hig-row is-tappable" style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }}>
              <div className="hig-row-text">
                <span className="title">Sign out</span>
                <span className="sub">{userName}</span>
              </div>
              <Symbol name="arrow.right" size={16} style={{ color: "var(--label-secondary)" }} />
            </button>
          </form>
        </ListSection>
      </Screen>
      {menu && <MenuLayer items={menu.items} y={menu.y} label={menu.label} onClose={() => setMenu(null)} />}
    </>
  );
}
