# JobPulse — Personalized Jobs Board

## Overview
JobPulse is a Clerk-authenticated jobs board that syncs openings from the Arbeitnow public API into Supabase, then presents them in a Next.js app with durable "new since last visit" cues, saved jobs, and preference-driven defaults.

The product is no longer a Remotive-only remote alert board. It now treats Arbeitnow as a broader jobs source and exposes remote work as a first-class filter rather than the entire product definition.

## Current Architecture

```text
Arbeitnow API (public, paginated)
      │  sync on boot + every 6 hours by default
      ▼
┌─────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│   Worker    │──────▶│      Supabase        │◀──────│     Frontend        │
│ (Railway)   │ write │  - jobs              │ read  │ (Next.js / Vercel)  │
│ Node.js     │       │  - user_preferences  │ + RT  │ Clerk auth + UI     │
└─────────────┘       │  - saved_jobs        │       └─────────────────────┘
                      └──────────────────────┘
```

## Data Flow
1. The Railway worker starts, polls Arbeitnow immediately, then repeats on a configurable interval. The default is `6 hours`.
2. The worker fetches paginated Arbeitnow results (`100` jobs per page) until the feed is exhausted or a configured page cap is reached.
3. The worker normalizes each listing into the shared `jobs` table, keyed by `(source, source_job_id)`.
4. Each synced row is marked active with fresh `last_seen_at`; jobs missing from the latest source snapshot are soft-archived with `is_active = false` and `archived_at`.
5. The Next.js app server-renders the feed from active jobs only and loads saved job ids for the signed-in user.
6. The client fetches saved preference defaults, marks the feed as viewed, and then applies topic, keyword, remote, and location filters in the browser.
7. Supabase Realtime subscriptions on `jobs` `INSERT` and `UPDATE` keep the in-app feed aligned with worker syncs.
8. Saved jobs persist even when a listing is archived; archived rows remain visible on `/saved` but never appear in the main feed.

## Monorepo Structure
```text
/
├── CLAUDE.md
├── AGENTS.md
├── supabase/
│   ├── schema.sql
│   └── migrations/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── preferences/
│   │   │   ├── saved/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── middleware.ts
│   │   └── utils/supabase/
│   └── worker/
│       ├── index.ts
│       └── package.json
└── package.json
```

## Database Schema

### `jobs`
Purpose: source-normalized listings from external job providers.

Important columns:
- `id uuid primary key`
- `remotive_id integer unique null`
- `source text not null default 'remotive'`
- `source_job_id text not null`
- `source_slug text null`
- `title text not null`
- `company_name text not null`
- `category text null`
- `tags text[]`
- `job_type text null`
- `url text not null`
- `salary text null`
- `location text null`
- `remote boolean not null default false`
- `description_html text null`
- `publication_date timestamptz null`
- `company_logo text null`
- `is_active boolean not null default true`
- `last_seen_at timestamptz not null default now()`
- `archived_at timestamptz null`
- `created_at timestamptz default now()`

Indexes / constraints:
- legacy uniqueness on `remotive_id`
- current source-aware uniqueness on `(source, source_job_id)`

Realtime:
- enabled on `jobs`
- the frontend listens for both `INSERT` and `UPDATE`

### `user_preferences`
Purpose: per-user feed defaults and read state.

Important columns:
- `user_id text unique not null`
- `categories text[]`
- `keywords text[]`
- `remote_only boolean not null default false`
- `preferred_locations text[] not null default '{}'`
- `last_feed_viewed_at timestamptz null`
- `created_at`
- `updated_at`

### `saved_jobs`
Purpose: user bookmarks.

Important columns:
- `user_id text not null`
- `job_id uuid not null references jobs(id) on delete cascade`
- `created_at`
- unique `(user_id, job_id)`

## Taxonomy and Filtering
JobPulse uses a stable product topic layer instead of exposing source-specific categories directly.

Current normalized topics:
- `Software Engineering`
- `Product`
- `Design`
- `Data`
- `Marketing`
- `Sales`
- `Finance`
- `Operations`
- `Customer Support`
- `HR`
- `Security`
- `Other`

The worker stores the normalized topic in `jobs.category` and preserves the source tags in `jobs.tags`.

Saved preferences are compatibility-mapped when older Remotive slugs or labels are encountered. Example:
- `software-dev -> Software Engineering`
- `customer-support -> Customer Support`
- `product -> Product`
- `Project Management -> Product`
- `Software Development -> Software Engineering`

## Arbeitnow Source Notes
- endpoint: `https://www.arbeitnow.com/api/job-board-api?page=1`
- no API key required
- pagination via `links.next`
- jobs are updated hourly by the provider
- each record includes `slug`, `remote`, `tags`, `job_types`, `location`, `description`, and `created_at`

## Auth and Access Model
- Clerk handles all user authentication
- Supabase Auth is not used
- frontend data access uses `createBrowserClient` and `createServerClient` from `@supabase/ssr`
- worker writes use `SUPABASE_SERVICE_ROLE_KEY`
- server API routes enforce the current Clerk user and then read/write Supabase rows

## Product Surfaces
- `/`: signed-in feed with "New for you" and "All matches"
- `/saved`: saved shortlist, including archived listings marked `No longer active`
- `/preferences`: feed defaults for topics, keywords, remote-only mode, and preferred locations
- signed-out `/`: landing page plus read-only job preview

## Deployment
- `apps/web` deploys to Vercel
- `apps/worker` deploys to Railway
- Supabase hosts the database and Realtime
- Clerk provides auth for both local and deployed environments

## Environment Variables

### Frontend
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### Worker
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
POLL_INTERVAL_MS=
JOB_SOURCE_PROVIDER=arbeitnow
ARBEITNOW_MAX_PAGES=5
```
