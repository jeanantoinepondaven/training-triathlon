import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { ImportScreen } from "@/components/import-screen";

export default async function NewCyclePage() {
  const me = await requireUser();
  return <ImportScreen people={await listUsers()} meId={me.id} />;
}
