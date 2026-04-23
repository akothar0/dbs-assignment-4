# AGENTS.md — Codex Build Plan for JobPulse

Read CLAUDE.md first for full architecture, schema, and data flow.

## Project: JobPulse — Live Remote Job Alert Board
A real-time job alert system. Worker polls Remotive API → Supabase → Next.js frontend with Clerk auth and Supabase Realtime.

## Git Remote
```
https://github.com/akothar0/dbs-assignment-4.git
```
Commit after every completed stage below. Use descriptive commit messages.

---

## STAGE 1: Monorepo Scaffolding

**Goal:** Set up the monorepo structure with workspaces, Next.js frontend, and Node.js worker.

### Steps:
1. Initialize root `package.json` with npm workspaces:
   ```json
   {
     "name": "jobpulse",
     "private": true,
     "workspaces": ["apps/*"]
   }
   ```
2. Create `apps/web/` — scaffold a Next.js 14+ app with App Router and Tailwind CSS:
   ```bash
   cd apps
   npx create-next-app@latest web --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*" --yes
   ```
3. Create `apps/worker/` — minimal Node.js project:
   ```bash
   mkdir -p apps/worker
   cd apps/worker
   npm init -y
   ```
   - Install dependencies: `@supabase/supabase-js`, `dotenv`, `tsx` (for running TypeScript)
   - Create `apps/worker/index.ts` with a placeholder: `console.log("Worker starting...")`
   - Add to worker `package.json`:
     ```json
     "scripts": {
       "start": "npx tsx index.ts",
       "dev": "npx tsx watch index.ts"
     }
     ```
4. Create `.gitignore` at root:
   ```
   node_modules/
   .env
   .env.local
   .next/
   dist/
   ```
5. Copy CLAUDE.md and AGENTS.md into the root of the repo.
6. Run `npm install` from root to link workspaces.

**Commit:** `"Stage 1: monorepo scaffolding with Next.js frontend and Node.js worker"`

---

## STAGE 2: Supabase Setup

**Goal:** Create tables in Supabase and enable Realtime.

### Steps:
1. In `apps/web/`, create the Supabase utility files:
   - `utils/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr`
   - `utils/supabase/server.ts` — server client using `createServerClient` from `@supabase/ssr`
   - `utils/supabase/middleware.ts` — middleware helper for session refresh
   
   Use these env vars (user will fill actual values in .env.local):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   ```
   
   **Client helper (`utils/supabase/client.ts`):**
   ```typescript
   import { createBrowserClient } from "@supabase/ssr";
   export const createClient = () =>
     createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
     );
   ```

   **Server helper (`utils/supabase/server.ts`):**
   ```typescript
   import { createServerClient } from "@supabase/ssr";
   import { cookies } from "next/headers";
   export const createClient = async () => {
     const cookieStore = await cookies();
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
       {
         cookies: {
           getAll() { return cookieStore.getAll(); },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
             } catch { /* ignore in Server Components */ }
           },
         },
       },
     );
   };
   ```

2. Install Supabase packages in `apps/web/`:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

3. Create a SQL migration file at `supabase/schema.sql` (for reference / manual run in Supabase SQL editor):
   ```sql
   -- Jobs table
   CREATE TABLE IF NOT EXISTS jobs (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     remotive_id integer UNIQUE NOT NULL,
     title text NOT NULL,
     company_name text NOT NULL,
     category text,
     tags text[] DEFAULT '{}',
     job_type text,
     url text NOT NULL,
     salary text,
     location text,
     publication_date timestamptz,
     company_logo text,
     created_at timestamptz DEFAULT now()
   );

   -- User preferences table
   CREATE TABLE IF NOT EXISTS user_preferences (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id text UNIQUE NOT NULL,
     categories text[] DEFAULT '{}',
     keywords text[] DEFAULT '{}',
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );

   -- Saved jobs table
   CREATE TABLE IF NOT EXISTS saved_jobs (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id text NOT NULL,
     job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT now(),
     UNIQUE(user_id, job_id)
   );

   -- Enable Realtime on jobs table
   ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

   -- RLS policies
   ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
   ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

   -- Jobs: anyone can read, only service role can write
   CREATE POLICY "Anyone can read jobs" ON jobs FOR SELECT USING (true);

   -- User preferences: open read/write (app layer enforces user_id via Clerk)
   CREATE POLICY "Users manage own preferences" ON user_preferences
     FOR ALL USING (true) WITH CHECK (true);

   -- Saved jobs: open read/write (app layer enforces user_id via Clerk)
   CREATE POLICY "Users manage own saved jobs" ON saved_jobs
     FOR ALL USING (true) WITH CHECK (true);
   ```

4. Create `.env.local` template in `apps/web/`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   ```

5. Create `.env` template in `apps/worker/`:
   ```
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

**Commit:** `"Stage 2: Supabase schema, client helpers, and env templates"`

---

## STAGE 3: Clerk Auth Integration

**Goal:** Add Clerk authentication to the Next.js frontend.

### Steps:
1. Install Clerk in `apps/web/`:
   ```bash
   npm install @clerk/nextjs
   ```

2. Create `apps/web/middleware.ts` (NOT inside `app/`):
   ```typescript
   import { clerkMiddleware } from '@clerk/nextjs/server'
   export default clerkMiddleware()
   export const config = {
     matcher: [
       '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
       '/(api|trpc)(.*)',
     ],
   }
   ```

3. Update `apps/web/app/layout.tsx`:
   - Wrap `{children}` with `<ClerkProvider>` inside `<body>`
   - Add a `<Navbar />` component that uses `<Show when="signed-out">` with `<SignInButton />` and `<SignUpButton />`, and `<Show when="signed-in">` with `<UserButton />`
   - Import `ClerkProvider`, `Show`, `UserButton`, `SignInButton`, `SignUpButton` from `@clerk/nextjs`
   
   **CRITICAL Clerk rules:**
   - ALWAYS use `<Show when="signed-in">` and `<Show when="signed-out">` — NEVER use deprecated `<SignedIn>` or `<SignedOut>`
   - ALWAYS use `clerkMiddleware()` — NEVER use deprecated `authMiddleware()`
   - ALWAYS import from `@clerk/nextjs` or `@clerk/nextjs/server`
   - ALWAYS use App Router patterns (app/ directory) — NEVER pages router

4. Use `auth()` from `@clerk/nextjs/server` in server components/API routes to get the current user ID:
   ```typescript
   import { auth } from '@clerk/nextjs/server'
   const { userId } = await auth()
   ```

**Commit:** `"Stage 3: Clerk auth with middleware, provider, and navbar"`

---

## STAGE 4: Background Worker

**Goal:** Build the worker that polls Remotive and upserts jobs into Supabase.

### Steps:
1. In `apps/worker/`, install deps:
   ```bash
   npm install @supabase/supabase-js dotenv
   npm install -D tsx typescript @types/node
   ```

2. Create `apps/worker/index.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import 'dotenv/config'

   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )

   const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

   interface RemotiveJob {
     id: number
     url: string
     title: string
     company_name: string
     company_logo: string
     category: string
     tags: string[]
     job_type: string
     publication_date: string
     salary: string
     candidate_required_location: string
   }

   async function pollJobs() {
     console.log(`[${new Date().toISOString()}] Polling Remotive API...`)
     try {
       const res = await fetch('https://remotive.com/api/remote-jobs')
       if (!res.ok) {
         console.error(`API error: ${res.status}`)
         return
       }
       const data = await res.json()
       const jobs: RemotiveJob[] = data.jobs

       console.log(`Fetched ${jobs.length} jobs from Remotive`)

       // Map to our schema
       const rows = jobs.map((job) => ({
         remotive_id: job.id,
         title: job.title,
         company_name: job.company_name,
         category: job.category,
         tags: job.tags || [],
         job_type: job.job_type,
         url: job.url,
         salary: job.salary || null,
         location: job.candidate_required_location || null,
         publication_date: job.publication_date,
         company_logo: job.company_logo || null,
       }))

       // Upsert in batches of 100
       for (let i = 0; i < rows.length; i += 100) {
         const batch = rows.slice(i, i + 100)
         const { error } = await supabase
           .from('jobs')
           .upsert(batch, { onConflict: 'remotive_id' })
         if (error) {
           console.error(`Upsert error (batch ${i}):`, error.message)
         } else {
           console.log(`Upserted batch ${i}-${i + batch.length}`)
         }
       }

       console.log(`[${new Date().toISOString()}] Poll complete.`)
     } catch (err) {
       console.error('Poll failed:', err)
     }
   }

   // Run immediately, then on interval
   pollJobs()
   setInterval(pollJobs, POLL_INTERVAL)
   console.log(`Worker started. Polling every ${POLL_INTERVAL / 1000}s`)
   ```

3. Ensure worker `package.json` has:
   ```json
   "scripts": {
     "start": "npx tsx index.ts",
     "dev": "npx tsx watch index.ts"
   }
   ```

4. Test locally: fill in `apps/worker/.env` with real values and run `npm run dev` from `apps/worker/`. Verify rows appear in Supabase dashboard.

**Commit:** `"Stage 4: background worker polling Remotive API and upserting to Supabase"`

---

## STAGE 5: Frontend — Job Feed with Realtime

**Goal:** Display jobs from Supabase with live updates via Realtime subscription.

### Steps:
1. Create `apps/web/app/page.tsx` — the main job feed page:
   - Server component that does initial fetch of recent jobs from Supabase
   - Renders a client component `<JobFeed />` with the initial data
   - Protected: redirect to sign-in if not authenticated (use `auth()` from Clerk)

2. Create `apps/web/components/JobFeed.tsx` (client component — `"use client"`):
   - Receives `initialJobs` as prop
   - Maintains jobs in state
   - On mount, subscribes to Supabase Realtime:
     ```typescript
     const supabase = createClient() // browser client
     const channel = supabase
       .channel('jobs-realtime')
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
         setJobs(prev => [payload.new as Job, ...prev])
       })
       .subscribe()
     ```
   - Clean up subscription on unmount
   - Displays jobs as a list of `<JobCard />` components
   - Shows a "New job just posted!" toast/indicator when a realtime job arrives

3. Create `apps/web/components/JobCard.tsx`:
   - Displays: title, company name, category badge, tags, location, salary, publication date, company logo
   - "Save" button (bookmark icon) — calls API route to save/unsave
   - Links out to the original job posting URL
   - Clean, modern card design with Tailwind CSS

4. Add filtering: category dropdown and keyword search input at the top of the feed
   - Filter client-side from the loaded jobs
   - Connect to user preferences (loaded from Supabase on mount for logged-in users)

**Commit:** `"Stage 5: job feed with Supabase Realtime subscription and job cards"`

---

## STAGE 6: User Preferences

**Goal:** Let users set and persist their job preferences (categories, keywords).

### Steps:
1. Create API routes in `apps/web/app/api/preferences/route.ts`:
   - `GET` — fetch preferences for the current Clerk user
   - `POST` — create/update preferences for the current Clerk user
   - Use `auth()` from `@clerk/nextjs/server` to get `userId`
   - Use Supabase server client with anon key (RLS is permissive, app enforces user_id)

   ```typescript
   import { auth } from '@clerk/nextjs/server'
   import { createClient } from '@/utils/supabase/server'
   import { NextResponse } from 'next/server'

   export async function GET() {
     const { userId } = await auth()
     if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     
     const supabase = await createClient()
     const { data, error } = await supabase
       .from('user_preferences')
       .select('*')
       .eq('user_id', userId)
       .single()
     
     return NextResponse.json(data || { categories: [], keywords: [] })
   }

   export async function POST(request: Request) {
     const { userId } = await auth()
     if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     
     const body = await request.json()
     const supabase = await createClient()
     
     const { data, error } = await supabase
       .from('user_preferences')
       .upsert({
         user_id: userId,
         categories: body.categories || [],
         keywords: body.keywords || [],
         updated_at: new Date().toISOString(),
       }, { onConflict: 'user_id' })
       .select()
       .single()
     
     return NextResponse.json(data)
   }
   ```

2. Create `apps/web/app/preferences/page.tsx`:
   - Multi-select for categories (list all Remotive categories):
     `software-dev, customer-support, design, marketing, sales, product, business, data, devops, finance, human-resources, qa, writing, all-others`
   - Text input for keywords (comma-separated, stored as array)
   - Save button that POST to `/api/preferences`
   - Load existing preferences on mount

3. On the main feed page, apply user preferences as default filters:
   - If user has preferences saved, auto-filter the feed to show matching jobs
   - User can still manually adjust filters on the fly

**Commit:** `"Stage 6: user preferences with API routes and preferences page"`

---

## STAGE 7: Saved Jobs

**Goal:** Let users bookmark jobs and view their saved list.

### Steps:
1. Create API routes in `apps/web/app/api/saved-jobs/route.ts`:
   - `GET` — fetch saved jobs for current user (join with jobs table)
   - `POST` — save a job (insert into saved_jobs)
   - `DELETE` — unsave a job (delete from saved_jobs)
   - All require `auth()` from Clerk

2. Create `apps/web/app/saved/page.tsx`:
   - Displays saved jobs for the logged-in user
   - Each card has an "Unsave" button
   - Empty state: "No saved jobs yet. Browse the feed and bookmark jobs you're interested in."

3. Update `<JobCard />` to show filled/unfilled bookmark icon based on whether the job is saved
   - Pass `savedJobIds` set from parent

**Commit:** `"Stage 7: save/unsave jobs with saved jobs page"`

---

## STAGE 8: Polish & Deploy

**Goal:** Clean up UI, add navigation, and prepare for deployment.

### Steps:
1. Build a proper `<Navbar />` component:
   - Logo/app name "JobPulse"
   - Nav links: Feed, Saved Jobs, Preferences
   - Clerk `<Show>` / `<UserButton>` / `<SignInButton>` on the right
   - Mobile responsive (hamburger menu or simplified layout)

2. Add a landing page state for signed-out users:
   - Brief description of what JobPulse does
   - Sign up / Sign in CTAs
   - Show a preview of recent jobs (read-only, no save functionality)

3. Style the entire app with Tailwind CSS:
   - Consistent color scheme, clean typography
   - Cards with hover effects
   - Category badges with distinct colors
   - Responsive design (works on mobile)
   - Loading states and empty states

4. Ensure all pages handle edge cases:
   - Loading spinners while data fetches
   - Error states if Supabase is unreachable
   - Empty states with helpful messages

5. Deployment preparation:
   - `apps/web/` deploys to Vercel — set root directory to `apps/web`, add all env vars
   - `apps/worker/` deploys to Railway — connect GitHub, set root directory to `apps/worker`, set start command to `npm start`, add env vars
   - Verify Realtime works in production (Supabase Realtime is enabled by default on paid plans; on free tier ensure the table is added to the realtime publication)

6. Test end-to-end:
   - Sign up as a new user on the live Vercel URL
   - Set preferences
   - Verify jobs appear and update in real time
   - Save a job, check saved page
   - Have a second person sign up and verify they see their own preferences

**Commit:** `"Stage 8: UI polish, navigation, responsive design, deployment ready"`

---

## Design Direction
- **Clean and functional** — this is a productivity tool, not a marketing site
- **Color scheme:** Use a professional palette. Consider a blue-gray base with accent color for CTAs and badges
- **Typography:** Use the Next.js default font (Geist) or a clean sans-serif
- **Cards:** White cards on a light gray background, subtle shadows, rounded corners
- **Category badges:** Pill-shaped, each category gets a distinct muted color
- **Realtime indicator:** Small pulsing dot or subtle animation when new jobs arrive

## Common Pitfalls to Avoid
- Do NOT use `<SignedIn>` or `<SignedOut>` from Clerk — use `<Show when="signed-in">` and `<Show when="signed-out">`
- Do NOT use `authMiddleware` — use `clerkMiddleware`
- Do NOT put `middleware.ts` inside `app/` — it goes at the root of the Next.js project (`apps/web/middleware.ts`)
- Do NOT use Supabase Auth — we're using Clerk. The Supabase client is only for data access.
- Do NOT forget to enable Realtime on the `jobs` table in Supabase
- Do NOT store secrets in `.env.local` that start with `NEXT_PUBLIC_` — only public-safe keys get that prefix
- The worker MUST use the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) to bypass RLS for writes