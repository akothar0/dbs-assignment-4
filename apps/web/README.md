# JobPulse Web

Next.js frontend for JobPulse.

Responsibilities:
- render the signed-in feed, saved jobs, and preferences pages
- use Clerk for authentication
- use `@supabase/ssr` browser/server clients for data access
- subscribe to realtime `jobs` changes for live feed updates

Run locally from the repo root:

```bash
npm run dev -w web
```
