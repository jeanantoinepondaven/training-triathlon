"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";
import { pushCheckIn } from "@/lib/intervals";
import { CHECKIN, type CheckInKey } from "@/lib/health";

/** Morning check-in: stored here and written back to intervals.icu when connected. */
export async function saveCheckIn(values: Partial<Record<CheckInKey, number | null>>): Promise<{ error?: string; pushed?: boolean }> {
  const me = await requireUser();
  const date = today();
  const v: Partial<Record<CheckInKey, number | null>> = {};
  for (const { key } of CHECKIN) {
    const x = values[key];
    if (x === undefined) continue;
    if (x !== null && (!Number.isInteger(x) || x < 1 || x > 4)) return { error: "Invalid value" };
    v[key] = x;
  }
  const db = await getDb();
  const [before] = await db.select().from(schema.wellness).where(and(eq(schema.wellness.userId, me.id), eq(schema.wellness.date, date)));
  await db
    .insert(schema.wellness)
    .values({ userId: me.id, date, ...v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [schema.wellness.userId, schema.wellness.date], set: { ...v, updatedAt: new Date() } });
  let pushed = false;
  try {
    // Send answers; send 0 ("cleared") only for an answer that was there before.
    const out = Object.fromEntries(
      Object.entries(v)
        .filter(([k, x]) => x != null || before?.[k as CheckInKey] != null)
        .map(([k, x]) => [k, x ?? 0]),
    );
    if (Object.keys(out).length) await pushCheckIn(me.id, date, out);
    pushed = true;
  } catch {
    // Kept locally; the next pull would overwrite only fields intervals.icu has.
  }
  revalidatePath("/health");
  revalidatePath("/");
  return { pushed };
}

export async function setShareHealth(on: boolean) {
  const me = await requireUser();
  const db = await getDb();
  await db.update(schema.users).set({ shareHealth: on ? 1 : 0 }).where(eq(schema.users.id, me.id));
  revalidatePath("/health");
  revalidatePath("/");
}
