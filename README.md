# Training

A private training planner for two people: import 3-week cycles, adapt your week, log sessions, and track progression.

**Stack:** Next.js 16 (App Router) · Vercel Hobby · Neon Postgres · Drizzle ORM · Tailwind v4 · Recharts · installable PWA. Runs at €0/month.

## Features (v0.1)

- **Week view.** Today is highlighted. Navigate weeks and switch between your plan and your partner's (theirs is read-only).
- **Adapt your week.** Tap ⇄ on a session, then tap another day (or drag on desktop). The original day is kept, so you can reset it.
- **Quick complete.** Tick a session as done straight from the week view.
- **Session logging.** Gym: sets × reps × kg, pre-filled from the plan, with your last performance shown. Run, bike, swim: distance, time, HR, power, elevation. All sports: RPE, mood and notes.
- **Cycle import.** Paste or upload YAML, check the preview, then import for me, my partner, or both. See [CYCLE_FORMAT.md](CYCLE_FORMAT.md).
- **Progress.** Weekly consistency, distance and time per sport, estimated 1RM curves per exercise, and records (longest and fastest).
- **One-off sessions.** Add an extra session to any day with the `+` button.
- **Accounts.** Private sign-up, limited to `ALLOWED_EMAILS` or the first `MAX_USERS` (2) people.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000, uses an embedded Postgres in ./.pglite (no setup)
npm test           # parser/unit tests
```

## Deploy (free)

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com), click **Add New → Project** and import the repo.
3. In the project, open **Storage → Create → Neon** (free). This sets `DATABASE_URL` for you. You can also create a project on [neon.tech](https://neon.tech) and paste its connection string.
4. Add the environment variables `SESSION_SECRET` (run `openssl rand -base64 32`) and `ALLOWED_EMAILS` (your two emails).
5. Deploy. The build runs the database migrations automatically.
6. On your phones, open the site, then use **Share → Add to Home Screen** (iOS) or **Install app** (Android).

## Project layout

```
src/db/schema.ts          tables: users, cycles, workouts (plan + log stored as typed JSON)
src/lib/cycle-format.ts   YAML → validated sessions
src/lib/progress.ts       progression maths (e1RM, weekly volume, adherence, records)
src/app/actions/          server actions (auth, workouts, cycles)
src/app/(app)/            pages: week, workout/[id], cycles, progress, add
drizzle/                  SQL migrations (npm run db:generate after editing the schema)
```
