# JobPulse — Live Remote Job Alert Board

## Overview
A real-time job alert system that polls the Remotive API for remote job listings, stores them in Supabase, and displays matching jobs to users on a Next.js frontend. Users sign up via Clerk, set their job preferences (categories, keywords), and see new matching jobs appear in real time without page refresh.

## Architecture

```
Remotive API (free, no auth)
      │  polls every 5 minutes
      ▼
┌─────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Worker     │──────▶│    Supabase      │◀──────│   Frontend       │
│  (Railway)   │ write │  - jobs table    │ read  │  (Next.js/Vercel)│
│  Node.js     │       │  - user_prefs    │ + RT  │  + Clerk Auth    │
│  cron: 5min  │       │  - saved_jobs    │       │  + Tailwind CSS  │
└─────────────┘       └──────────────────┘       └──────────────────┘
                        Realtime enabled on         Subscribes to
                        `jobs` table                Realtime changes
```

## Data Flow
1. **Worker** (Railway) runs on a 5-minute interval
2. Worker fetches `https://remotive.com/api/remote-jobs` (returns all remote jobs as JSON)
3. Worker parses response, upserts into Supabase `jobs` table (keyed on `remotive_id`)
4. Supabase **Realtime** broadcasts INSERT events on `jobs` table
5. **Frontend** (Vercel) subscribes to Realtime channel on `jobs`
6. When new jobs arrive, frontend filters against the logged-in user's preferences and displays matches
7. Users can **save/bookmark** jobs → stored in `saved_jobs` table

## Monorepo Structure
```
/
├── CLAUDE.md
├── AGENTS.md
├── apps/
│   ├── web/                    # Next.js 14+ App Router frontend
│   │   ├── app/
│   │   │   ├── layout.tsx      # ClerkProvider + nav
│   │   │   ├── page.tsx        # Landing / job feed (protected)
│   │   │   ├── preferences/
│   │   │   │   └── page.tsx    # User preference settings
│   │   │   └── saved/
│   │   │       └── page.tsx    # Saved/bookmarked jobs
│   │   ├── components/
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobFeed.tsx     # Realtime subscription + display
│   │   │   ├── CategoryFilter.tsx
│   │   │   └── Navbar.tsx
│   │   ├── utils/
│   │   │   └── supabase/
│   │   │       ├── client.ts   # Browser client
│   │   │       ├── server.ts   # Server client
│   │   │       └── middleware.ts
│   │   ├── middleware.ts       # Clerk middleware
│   │   ├── .env.local          # All env vars
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   └── package.json
│   └── worker/                 # Background worker
│       ├── index.ts            # Main polling script
│       ├── package.json
│       └── .env                # SUPABASE_URL + SERVICE_ROLE_KEY
├── package.json                # Root (workspaces)
└── .gitignore
```

## Database Schema (Supabase)

### `jobs` table
| Column        | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | uuid (PK)   | auto-generated                 |
| remotive_id   | integer     | UNIQUE — from Remotive API     |
| title         | text        |                                |
| company_name  | text        |                                |
| category      | text        | e.g. "software-dev"            |
| tags          | text[]      | skill tags from API            |
| job_type      | text        | full_time, contract, etc.      |
| url           | text        | link to job posting            |
| salary        | text        | salary string (if provided)    |
| location      | text        | e.g. "Worldwide", "USA Only"   |
| publication_date | timestamptz |                              |
| company_logo  | text        | logo URL                       |
| created_at    | timestamptz | default now()                  |

**Realtime: ENABLED on this table (INSERT events)**

### `user_preferences` table
| Column        | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | uuid (PK)   | auto-generated                 |
| user_id       | text        | Clerk user ID (UNIQUE)         |
| categories    | text[]      | selected job categories        |
| keywords      | text[]      | search keywords                |
| created_at    | timestamptz | default now()                  |
| updated_at    | timestamptz | default now()                  |

### `saved_jobs` table
| Column        | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | uuid (PK)   | auto-generated                 |
| user_id       | text        | Clerk user ID                  |
| job_id        | uuid (FK)   | references jobs.id             |
| created_at    | timestamptz | default now()                  |

**UNIQUE constraint on (user_id, job_id)**

## RLS Policies
- `jobs`: SELECT open to all authenticated (or even anon); INSERT/UPDATE only via service role (worker)
- `user_preferences`: Users can only SELECT/INSERT/UPDATE/DELETE their own rows (WHERE user_id = auth.uid() or via Clerk ID matching)
- `saved_jobs`: Users can only SELECT/INSERT/DELETE their own rows

**Note:** Since we use Clerk (not Supabase Auth), RLS policies that rely on `auth.uid()` won't work directly. Instead, use permissive policies for reads and pass `user_id` filters from the application layer, OR use service role key on server-side API routes that verify Clerk session first.

## Remotive API
- Endpoint: `https://remotive.com/api/remote-jobs`
- Method: GET
- Auth: None required
- Rate limits: Reasonable (no documented limit, poll every 5 min)
- Response shape:
```json
{
  "job-count": 1234,
  "jobs": [
    {
      "id": 12345,
      "url": "https://remotive.com/remote-jobs/...",
      "title": "Senior Frontend Engineer",
      "company_name": "Acme Inc",
      "company_logo": "https://...",
      "category": "software-dev",
      "tags": ["javascript", "react", "typescript"],
      "job_type": "full_time",
      "publication_date": "2026-04-20T00:00:00",
      "salary": "$120k - $150k",
      "candidate_required_location": "Worldwide"
    }
  ]
}
```

## Available Remotive Categories
software-dev, customer-support, design, marketing, sales, product, business, data, devops, finance, human-resources, qa, writing, all-others

## Environment Variables

### Frontend (apps/web/.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-pub-key>
CLERK_SECRET_KEY=<clerk-secret>
```

### Worker (apps/worker/.env)
```
SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Railway (worker env vars)
Same as worker .env, set in Railway dashboard.

### Vercel (frontend env vars)
Same as frontend .env.local, set in Vercel dashboard.

## Key Technical Decisions
- **Clerk for auth** (not Supabase Auth) — assignment requirement
- **Supabase for data + realtime** — worker writes with service role key, frontend reads with anon key + Realtime subscription
- **No API routes needed for jobs** — frontend reads directly from Supabase client-side
- **API routes for preferences/saved** — server-side routes verify Clerk session, then read/write Supabase with user_id
- **Worker is standalone Node.js** — not a Next.js app, just a script with setInterval or cron