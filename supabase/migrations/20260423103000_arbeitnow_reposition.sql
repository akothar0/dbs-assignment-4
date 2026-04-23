ALTER TABLE public.jobs ALTER COLUMN remotive_id DROP NOT NULL;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source_job_id text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source_slug text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS remote boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS description_html text;

UPDATE public.jobs
SET
  source = COALESCE(source, 'remotive'),
  source_job_id = COALESCE(source_job_id, remotive_id::text),
  remote = COALESCE(remote, true)
WHERE source IS NULL
   OR source_job_id IS NULL
   OR remote IS DISTINCT FROM COALESCE(remote, true);

ALTER TABLE public.jobs ALTER COLUMN source SET DEFAULT 'remotive';
ALTER TABLE public.jobs ALTER COLUMN source SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN source_job_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_source_job_id_key
  ON public.jobs(source, source_job_id);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS remote_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS preferred_locations text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS last_feed_viewed_at timestamptz;
