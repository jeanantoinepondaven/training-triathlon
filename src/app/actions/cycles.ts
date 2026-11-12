"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { followChange } from "@/lib/intervals";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { parseCycle, type ParsedCycle } from "@/lib/cycle-format";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; errors: string[]; source: string }
  | { status: "preview"; cycle: ParsedCycle; source: string; target: string }
  | { status: "imported"; name: string; count: number; startDate: string };

export async function importCycle(_: ImportState, form: FormData): Promise<ImportState> {
  const user = await requireUser();
  const source = String(form.get("source") ?? "").replace(/\r\n?/g, "\n");
  const target = String(form.get("target") ?? "me");
  const intent = String(form.get("intent") ?? "preview");

  const res = parseCycle(source);
  if (!res.ok) return { status: "error", errors: res.errors, source };
  if (intent !== "import") return { status: "preview", cycle: res.cycle, source, target };

  const everyone = await listUsers();
  const owners =
    target === "both" ? everyone.map((u) => u.id) : target === "me" ? [user.id] : everyone.filter((u) => u.id === target).map((u) => u.id);
  if (!owners.length) return { status: "error", errors: ["Unknown athlete"], source };

  const db = await getDb();
  const c = res.cycle;
  for (const userId of owners) {
    const [row] = await db
      .insert(schema.cycles)
      .values({ userId, name: c.name, goal: c.goal, startDate: c.startDate, weeks: c.weeks, weekFocus: c.weekFocus, source })
      .returning({ id: schema.cycles.id });
    try {
      if (c.workouts.length) {
        await db.insert(schema.workouts).values(
          c.workouts.map((w) => ({
            userId,
            cycleId: row.id,
            week: w.week,
            plannedDate: w.date,
            date: w.date,
            position: w.position,
            sport: w.sport,
            title: w.title,
            description: w.description,
            plan: w.plan,
          })),
        );
      }
    } catch (e) {
      await db.delete(schema.cycles).where(eq(schema.cycles.id, row.id));
      return { status: "error", errors: [`Database error: ${(e as Error).message}`], source };
    }
  }
  revalidatePath("/", "layout");
  return { status: "imported", name: c.name, count: c.workouts.length, startDate: c.startDate };
}

export async function deleteCycle(id: string) {
  const user = await requireUser();
  const db = await getDb();
  // Take the cycle's sessions off the watch before they're deleted.
  const sent = await db.select().from(schema.workouts).where(and(eq(schema.workouts.cycleId, id), eq(schema.workouts.userId, user.id), isNotNull(schema.workouts.intervalsEventId)));
  for (const w of sent) await followChange(w, "deleted");
  await db.delete(schema.cycles).where(and(eq(schema.cycles.id, id), eq(schema.cycles.userId, user.id)));
  revalidatePath("/", "layout");
}
