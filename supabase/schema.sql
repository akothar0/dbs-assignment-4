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
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE jobs
SET
  is_active = COALESCE(is_active, true),
  last_seen_at = COALESCE(last_seen_at, now())
WHERE is_active IS DISTINCT FROM COALESCE(is_active, true)
   OR last_seen_at IS NULL;

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
