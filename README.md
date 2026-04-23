# JobPulse

JobPulse is a monorepo for a live remote job alert board:

- `apps/web`: Next.js frontend with Clerk auth and Supabase Realtime
- `apps/worker`: standalone TypeScript worker that polls the Remotive API and upserts jobs into Supabase

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
```

## Deployment

Frontend:

- Deploy `apps/web` to Vercel
- Set the project root to `apps/web`
- Add the four frontend env vars from `apps/web/.env.local`

Worker:

- Deploy `apps/worker` to Railway
- Set the project root to `apps/worker`
- Use `npm start` as the start command
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Validation checklist

- Sign up or sign in through Clerk
- Confirm the feed loads jobs from Supabase
- Save a job and confirm it appears on `/saved`
- Set categories and keywords on `/preferences`
- Confirm new jobs appear through the realtime subscription
