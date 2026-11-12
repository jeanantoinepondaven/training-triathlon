"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { connectIntervals, disconnectIntervals, syncNow, type ConnectState } from "@/app/actions/intervals";
import { Symbol } from "@/components/hig/symbol";
import { Button, Field, IconButton, ListRow, ListSection, Screen } from "@/components/hig/ui";
import { ToastSlot, useToast } from "@/components/hig/toast";

export type GarminStatus = { connected: boolean; athleteName: string | null; athleteId: string | null; lastSync: string | null; lastError: string | null };

const ago = (iso: string | null) => {
  if (!iso) return "Not yet";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "Just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function GarminSettings({ status }: { status: GarminStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [state, action, connecting] = useActionState<ConnectState, FormData>(connectIntervals, undefined);
  const [v, setV] = useState({ athleteId: "", apiKey: "" });

  return (
    <Screen title="Garmin" large={false} inlineSub="via intervals.icu" leading={<IconButton icon="chevron.left" label="Back" href="/cycles" />} bodyClass="pad-none" floating={<ToastSlot />}>
      <div className="s-head">
        <h1>Connect your watch</h1>
        <div className="meta">Your Garmin sessions fill in Tandem by themselves. You choose which planned sessions go to the watch.</div>
      </div>

      {status.connected ? (
        <>
          <div className="story">
            <span className="ic">
              <Symbol name="applewatch" size={20} weight="bold" />
            </span>
            <div>
              <b>Connected · {status.athleteName}</b>
              <span>Last sync {ago(status.lastSync).toLowerCase()} · checks when you open the app and once a day</span>
            </div>
          </div>
          {status.lastError && (
            <div className="err-row" style={{ borderRadius: "var(--radius-m)" }} role="alert">
              <Symbol name="exclamationmark.circle" size={18} weight="semibold" />
              {status.lastError}
            </div>
          )}
          <ListSection footer="Pulls the last 14 days: each activity fills its planned session (or is added as an extra session) and ticks it done. Your effort, mood and notes are kept.">
            <ListRow title="Athlete" detail={status.athleteId ?? "–"} />
            <ListRow
              title={<span style={{ color: "var(--tint-ink)" }}>{pending ? "Syncing…" : "Sync now"}</span>}
              leading={<Symbol name="arrow.triangle.2.circlepath" size={18} weight="semibold" style={{ color: "var(--tint-ink)" }} />}
              onClick={() =>
                start(async () => {
                  const r = await syncNow();
                  if (r.error) toast({ message: r.error, icon: "exclamationmark.circle" });
                  else toast({ message: r.matched + r.added ? `${r.matched + r.added} session${r.matched + r.added > 1 ? "s" : ""} synced from Garmin` : "Up to date", icon: "checkmark", tone: "done" });
                  router.refresh();
                })
              }
            />
          </ListSection>
          <ListSection header="Sending to the watch" footer="In a session, switch on “Send to watch”, or use the watch button on the week. intervals.icu puts it on your Garmin calendar; sync the watch to get it. Moving or skipping a sent session updates the watch automatically.">
            <ListRow title="Swim, bike and run" detail="Steps, paces, % FTP" />
            <ListRow title="Gym and football" detail="Stay in Tandem" />
          </ListSection>
          <Button
            variant="tinted"
            destructive
            size="l"
            full
            onClick={() =>
              confirm("Disconnect Garmin? Sessions already on the watch stay there.") &&
              start(async () => {
                await disconnectIntervals();
                router.refresh();
              })
            }
          >
            Disconnect
          </Button>
        </>
      ) : (
        <>
          <ListSection header="Before you start">
            <ListRow leading={<span className="hig-sporticon sz-s s-other">1</span>} title="Free intervals.icu account" subtitle="intervals.icu → sign up" />
            <ListRow leading={<span className="hig-sporticon sz-s s-other">2</span>} title="Connect Garmin there" subtitle="Settings → Garmin, tick “Upload planned workouts”" />
            <ListRow leading={<span className="hig-sporticon sz-s s-other">3</span>} title="Copy your API key" subtitle="Settings → Developer Settings (bottom of the page)" />
          </ListSection>
          <form action={action} className="stack" style={{ gap: 20 }}>
            <ListSection footer="The key is encrypted in Tandem's database and never shown again. Athlete ID is optional.">
              <Field id="f-key" name="apiKey" label="API key" type="password" placeholder="Paste here" value={v.apiKey} onChange={(x) => setV({ ...v, apiKey: x })} autoComplete="off" required />
              <Field id="f-ath" name="athleteId" label="Athlete ID" placeholder="i123456" value={v.athleteId} onChange={(x) => setV({ ...v, athleteId: x })} />
            </ListSection>
            {state?.error && (
              <div className="err-row" style={{ borderRadius: "var(--radius-m)" }} role="alert">
                <Symbol name="exclamationmark.circle" size={18} weight="semibold" />
                {state.error}
              </div>
            )}
            {state?.ok && <div className="story"><span className="ic"><Symbol name="checkmark" size={20} weight="bold" /></span><div><b>{state.ok}</b></div></div>}
            <Button type="submit" variant="prominent" size="xl" full icon="applewatch" disabled={connecting || !v.apiKey}>
              {connecting ? "Checking the key…" : "Connect"}
            </Button>
          </form>
        </>
      )}
      <p className="hig-caption" style={{ margin: 0, textAlign: "center" }}>
        Activity data comes from Garmin via intervals.icu. Garmin and the Garmin logo are trademarks of Garmin Ltd.
      </p>
    </Screen>
  );
}
