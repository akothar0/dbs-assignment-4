import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_POLL_INTERVAL = 6 * 60 * 60 * 1000;
const POLL_INTERVAL = Number(
  process.env.POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL,
);

if (!Number.isFinite(POLL_INTERVAL) || POLL_INTERVAL <= 0) {
  throw new Error("POLL_INTERVAL_MS must be a positive number.");
}

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  salary: string | null;
  candidate_required_location: string | null;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

async function pollJobs() {
  console.log(`[${new Date().toISOString()}] Polling Remotive API...`);

  try {
    const res = await fetch("https://remotive.com/api/remote-jobs");

    if (!res.ok) {
      console.error(`API error: ${res.status}`);
      return;
    }

    const data = (await res.json()) as RemotiveResponse;
    const jobs = data.jobs ?? [];
    const seenAt = new Date().toISOString();

    console.log(`Fetched ${jobs.length} jobs from Remotive`);

    const rows = jobs.map((job) => ({
      remotive_id: job.id,
      title: job.title,
      company_name: job.company_name,
      category: job.category,
      tags: job.tags ?? [],
      job_type: job.job_type,
      url: job.url,
      salary: job.salary || null,
      location: job.candidate_required_location || null,
      publication_date: job.publication_date || null,
      company_logo: job.company_logo || null,
      is_active: true,
      last_seen_at: seenAt,
      archived_at: null,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from("jobs")
        .upsert(batch, { onConflict: "remotive_id" });

      if (error) {
        console.error(`Upsert error (batch ${i}): ${error.message}`);
      } else {
        console.log(`Upserted batch ${i}-${i + batch.length - 1}`);
      }
    }

    const seenRemotiveIds = rows.map((job) => job.remotive_id);
    const archiveQuery = supabase
      .from("jobs")
      .update({
        is_active: false,
        archived_at: seenAt,
      })
      .eq("is_active", true);

    const { error: archiveError } =
      seenRemotiveIds.length > 0
        ? await archiveQuery.not(
            "remotive_id",
            "in",
            `(${seenRemotiveIds.join(",")})`,
          )
        : await archiveQuery;

    if (archiveError) {
      console.error(`Archive error: ${archiveError.message}`);
    }

    console.log(`[${new Date().toISOString()}] Poll complete.`);
  } catch (error) {
    console.error("Poll failed:", error);
  }
}

void pollJobs();
setInterval(() => {
  void pollJobs();
}, POLL_INTERVAL);

console.log(`Worker started. Polling every ${POLL_INTERVAL / 1000}s`);
