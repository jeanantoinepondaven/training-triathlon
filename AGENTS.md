<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes
- `cacheComponents` is intentionally OFF: every page is per-user and dynamic.
- Local dev uses PGlite (./.pglite) when DATABASE_URL is unset; prod uses Neon over HTTP (no interactive transactions).
- After editing src/db/schema.ts run `npm run db:generate` and commit the new file in drizzle/.
