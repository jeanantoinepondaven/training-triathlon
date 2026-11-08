import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// Configuration check. Reports only whether things are set, never their values.
export async function GET() {
  let database: string;
  try {
    const db = await getDb();
    await db.execute(sql`select 1 from users limit 1`);
    database = "ok";
  } catch (e) {
    database = `error: ${(e as Error).message.slice(0, 120)}`;
  }
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").filter((s) => s.trim()).length;
  return Response.json({
    database,
    databaseUrlSet: !!process.env.DATABASE_URL,
    sessionSecretSet: !!process.env.SESSION_SECRET,
    allowedEmails: allowed,
    timezone: process.env.APP_TIMEZONE ?? "Europe/Paris (default)",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
