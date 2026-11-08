import "server-only";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Production: Neon (DATABASE_URL set).
 * Local dev without DATABASE_URL: an embedded Postgres (PGlite) stored in ./.pglite,
 * migrated automatically, so `npm run dev` works with zero setup.
 */
const globalForDb = globalThis as unknown as { dbPromise?: Promise<DB> };

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema }) as unknown as DB;
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string in Vercel.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  globalForDb.dbPromise ??= createDb();
  return globalForDb.dbPromise;
}

export { schema };
