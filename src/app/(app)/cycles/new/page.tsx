import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { ImportForm } from "@/components/import-form";

export default async function NewCyclePage() {
  const me = await requireUser();
  const people = await listUsers();
  return (
    <div className="space-y-4">
      <Link href="/cycles" className="text-sm text-accent">‹ Cycles</Link>
      <div>
        <h1 className="text-2xl font-semibold">Import a cycle</h1>
        <p className="text-sm text-muted">Paste or upload a cycle file, check the preview, then import. Load the example to see the format.</p>
      </div>
      <ImportForm people={people} meId={me.id} />
    </div>
  );
}
