-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remotive_id integer UNIQUE,
  source text NOT NULL DEFAULT 'remotive',
  source_job_id text NOT NULL,
  source_slug text,
  title text NOT NULL,
  company_name text NOT NULL,
  category text,
  tags text[] DEFAULT '{}',
  job_type text,
  url text NOT NULL,
  salary text,
  location text,
  remote boolean NOT NULL DEFAULT false,
  description_html text,
  publication_date timestamptz,
  company_logo text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ALTER COLUMN remotive_id DROP NOT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'remotive';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_job_id text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_slug text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote boolean NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description_html text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE jobs
SET
  source = COALESCE(source, 'remotive'),
  source_job_id = COALESCE(source_job_id, remotive_id::text),
  remote = COALESCE(remote, true),
  is_active = COALESCE(is_active, true),
  last_seen_at = COALESCE(last_seen_at, now())
WHERE source IS NULL
   OR source_job_id IS NULL
   OR remote IS DISTINCT FROM COALESCE(remote, true)
   OR is_active IS DISTINCT FROM COALESCE(is_active, true)
   OR last_seen_at IS NULL;

ALTER TABLE jobs ALTER COLUMN source SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN source_job_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_source_job_id_key
  ON jobs(source, source_job_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  categories text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  remote_only boolean NOT NULL DEFAULT false,
  preferred_locations text[] NOT NULL DEFAULT '{}',
  last_feed_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS remote_only boolean NOT NULL DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_locations text[] NOT NULL DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_feed_viewed_at timestamptz;

-- Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable Realtime on jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
  END IF;
END
$$;

-- RLS policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'Anyone can read jobs'
  ) THEN
    CREATE POLICY "Anyone can read jobs" ON jobs
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_preferences'
      AND policyname = 'Users manage own preferences'
  ) THEN
    CREATE POLICY "Users manage own preferences" ON user_preferences
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_jobs'
      AND policyname = 'Users manage own saved jobs'
  ) THEN
    CREATE POLICY "Users manage own saved jobs" ON saved_jobs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
