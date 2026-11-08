import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { addWorkout } from "@/app/actions/workouts";
import { isISODate, today } from "@/lib/dates";
import { SPORTS } from "@/db/schema";
import { SPORT_LABEL } from "@/lib/sport";

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  await requireUser();
  const { date } = await searchParams;
  const d = isISODate(date) ? date : today();
  return (
    <div className="space-y-4">
      <Link href={`/?w=${d}`} className="text-sm text-accent">‹ Week</Link>
      <h1 className="text-2xl font-semibold">Add a session</h1>
      <form action={addWorkout} className="card space-y-4 p-4">
        <div>
          <span className="label">Sport</span>
          <div className="grid grid-cols-5 gap-1">
            {SPORTS.map((s, i) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="sport" value={s} defaultChecked={i === 1} className="peer sr-only" />
                <span className="block rounded-lg bg-surface-2 py-2 text-center text-sm text-muted peer-checked:bg-accent peer-checked:text-white">{SPORT_LABEL[s]}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" className="input" placeholder="e.g. Recovery jog" />
        </div>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" name="date" type="date" defaultValue={d} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={2} className="input" />
        </div>
        <button className="btn-primary w-full">Add session</button>
      </form>
    </div>
  );
}
