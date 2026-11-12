import { requireUser } from "@/lib/auth";
import { getHealth, getShareHealth, listRaces, listUsers } from "@/lib/data";
import { addDays, today as getToday } from "@/lib/dates";
import { intervalsStatus } from "@/lib/intervals";
import { racesFor } from "@/lib/races";
import { HealthScreen } from "@/components/health-screen";

const RANGES = { "4w": 28, "12w": 84, "6m": 182 } as const;

export default async function HealthPage({ searchParams }: PageProps<"/health">) {
  const me = await requireUser();
  const sp = await searchParams;
  const today = getToday();
  const people = await listUsers();
  const partner = people.find((p) => p.id !== me.id) ?? null;
  const partnerShares = partner ? await getShareHealth(partner.id) : false;
  const viewed = sp.u && partner && sp.u === partner.id && partnerShares ? partner : { id: me.id, name: me.name };
  const range = (typeof sp.r === "string" && sp.r in RANGES ? sp.r : "12w") as keyof typeof RANGES;
  const [days, status, share, races] = await Promise.all([getHealth(viewed.id, addDays(today, -(RANGES[range] + 28))), intervalsStatus(viewed.id), getShareHealth(me.id), listRaces()]);
  return (
    <HealthScreen
      key={`${viewed.id}-${range}`}
      today={today}
      days={days}
      range={range}
      rangeDays={RANGES[range]}
      mine={viewed.id === me.id}
      viewed={viewed}
      meId={me.id}
      partner={partner}
      partnerShares={partnerShares}
      share={share}
      connected={status.connected}
      lastSync={status.lastSync?.toISOString() ?? null}
      races={racesFor(races, viewed.id).map((r) => ({ date: r.date, label: r.priority }))}
    />
  );
}
