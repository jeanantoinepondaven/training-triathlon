import { requireUser } from "@/lib/auth";
import { intervalsStatus } from "@/lib/intervals";
import { GarminSettings } from "@/components/garmin-settings";

export default async function GarminPage() {
  const me = await requireUser();
  const s = await intervalsStatus(me.id);
  return <GarminSettings status={{ connected: s.connected, athleteName: s.athleteName, athleteId: s.athleteId, lastSync: s.lastSync?.toISOString() ?? null, lastError: s.lastError }} />;
}
