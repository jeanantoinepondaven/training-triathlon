// Applies SQL migrations in ./drizzle to the Neon database in DATABASE_URL.
// Runs automatically before `next build` (so every Vercel deploy is migrated).
// Without DATABASE_URL it does nothing: local dev migrates the embedded DB on start.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("migrate: no DATABASE_URL, skipping (local dev uses the embedded database)");
    return;
  }
  await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
  console.log("migrate: database is up to date");
}

main().catch((e) => {
  console.error("migrate failed:", e);
  process.exit(1);
});
