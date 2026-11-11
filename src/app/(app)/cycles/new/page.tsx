import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { ImportForm } from "@/components/import-form";
import { IconLink } from "@/components/tandem/ui";

export default async function NewCyclePage() {
  const me = await requireUser();
  const people = await listUsers();
  return (
    <>
      <div className="-ml-3 flex items-center gap-1">
        <IconLink href="/cycles" icon="left" label="Back to cycles" />
        <span className="td-label td-muted">Cycles</span>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="t-display-l m-0">Import a block</h1>
        <p className="m-0 text-ink-muted">Upload or paste your cycle file, check the preview, then import.</p>
      </header>
      <ImportForm people={people} meId={me.id} />
    </>
  );
}
