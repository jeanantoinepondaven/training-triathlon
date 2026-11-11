import { requireUser } from "@/lib/auth";
import { isISODate, today } from "@/lib/dates";
import { AddForm } from "@/components/add-form";
import { IconLink } from "@/components/tandem/ui";

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  await requireUser();
  const { date } = await searchParams;
  const d = isISODate(date) ? date : today();
  return (
    <>
      <div className="-ml-3 flex items-center gap-1">
        <IconLink href={`/?w=${d}`} icon="left" label="Back to the week" />
        <span className="td-label td-muted">Week</span>
      </div>
      <h1 className="t-display-l m-0">Add a session</h1>
      <AddForm date={d} />
    </>
  );
}
