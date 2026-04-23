# JobPulse

JobPulse is a monorepo for a personalized jobs board:

- `apps/web`: Next.js app with Clerk auth, Supabase data access, realtime feed updates, saved jobs, and feed defaults
- `apps/worker`: standalone TypeScript worker that syncs paginated Arbeitnow jobs into Supabase

## Product direction

JobPulse is now a broader jobs board, not a remote-only alert board.

The main user flow is:
- open the feed and review `New for you`
- refine with topic, keyword, remote, and location filters
- save promising roles
- return later and see what changed since the last visit

## Local development

From the repo root:

```bash
npm install
```

Frontend:

```bash
npm run dev -w web
```

Worker:

```bash
npm run dev -w @jobpulse/worker
```

## Environment files

Frontend expects `apps/web/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Worker expects `apps/worker/.env` with:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
POLL_INTERVAL_MS=
JOB_SOURCE_PROVIDER=arbeitnow
ARBEITNOW_MAX_PAGES=5
```

## Database

Reference SQL lives in:

- `supabase/schema.sql`
- `supabase/migrations/20260423103000_arbeitnow_reposition.sql`

Core tables:

- `jobs`
- `user_preferences`
- `saved_jobs`

## Deployment

Frontend:

- deploy `apps/web` to Vercel
- set project root to `apps/web`
- add the frontend env vars above

Worker:

- deploy `apps/worker` to Railway
- set project root to `apps/worker`
- use `npm start`
- add the worker env vars above

## Validation checklist

- sign in through Clerk
- confirm the feed loads active jobs
- confirm `New for you` and `All matches` render as expected
- change preferences and verify the feed defaults update
- save a job and confirm it appears on `/saved`
- confirm archived saved jobs stay visible and marked inactive
