import { requireUser } from "@/lib/auth";
import { listRaces, listUsers } from "@/lib/data";
import { today as getToday } from "@/lib/dates";
import { racesFor } from "@/lib/races";
import { RacesScreen } from "@/components/race-screens";

export default async function RacesPage() {
  const me = await requireUser();
  const [people, races] = await Promise.all([listUsers(), listRaces()]);
  const partner = people.find((p) => p.id !== me.id) ?? null;
  return <RacesScreen me={{ id: me.id, name: me.name }} partner={partner} today={getToday()} races={racesFor(races, me.id)} />;
}
