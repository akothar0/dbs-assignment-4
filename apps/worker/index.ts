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
const JOB_SOURCE_PROVIDER = process.env.JOB_SOURCE_PROVIDER ?? "arbeitnow";
const ARBEITNOW_MAX_PAGES = Number(process.env.ARBEITNOW_MAX_PAGES ?? 5);

if (!Number.isFinite(POLL_INTERVAL) || POLL_INTERVAL <= 0) {
  throw new Error("POLL_INTERVAL_MS must be a positive number.");
}

if (!Number.isInteger(ARBEITNOW_MAX_PAGES) || ARBEITNOW_MAX_PAGES <= 0) {
  throw new Error("ARBEITNOW_MAX_PAGES must be a positive integer.");
}

interface ArbeitnowJob {
  company_name: string;
  created_at: number;
  description: string;
  job_types: string[];
  location: string | null;
  remote: boolean;
  slug: string;
  tags: string[];
  title: string;
  url: string;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links?: {
    next?: string | null;
  };
  meta?: {
    current_page?: number;
  };
}

const TOPIC_RULES = [
  {
    topic: "Software Engineering",
    matchers: [
      "software",
      "developer",
      "engineer",
      "frontend",
      "backend",
      "full stack",
      "full-stack",
      "mobile",
      "platform",
      "devops",
      "cloud",
      "sre",
      "qa",
      "test",
      "typescript",
      "javascript",
      "python",
      "java",
    ],
  },
  {
    topic: "Product",
    matchers: [
      "product",
      "project manager",
      "program manager",
      "product manager",
      "product owner",
    ],
  },
  {
    topic: "Design",
    matchers: ["design", "designer", "ux", "ui", "creative"],
  },
  {
    topic: "Data",
    matchers: [
      "data",
      "analytics",
      "machine learning",
      "ai",
      "ml",
      "business intelligence",
      "science",
    ],
  },
  {
    topic: "Marketing",
    matchers: [
      "marketing",
      "content",
      "seo",
      "growth",
      "brand",
      "communication",
      "distribution marketing",
    ],
  },
  {
    topic: "Sales",
    matchers: [
      "sales",
      "business development",
      "account executive",
      "account manager",
      "client enablement",
      "cold caller",
    ],
  },
  {
    topic: "Finance",
    matchers: ["finance", "accounting", "buchhalter", "tax", "controlling"],
  },
  {
    topic: "Operations",
    matchers: [
      "operations",
      "management",
      "office",
      "administrator",
      "administration",
      "coordinator",
    ],
  },
  {
    topic: "Customer Support",
    matchers: [
      "customer support",
      "customer service",
      "support",
      "success",
      "service desk",
      "help desk",
      "kundenbetreuung",
    ],
  },
  {
    topic: "HR",
    matchers: ["recruit", "talent", "human resources", "people ops", "hr"],
  },
  {
    topic: "Security",
    matchers: ["security", "cyber", "infosec", "soc", "iam"],
  },
] as const;

function normalizeTopic(job: ArbeitnowJob) {
  const haystack = [job.title, ...(job.tags ?? []), job.description]
    .join(" ")
    .toLowerCase();

  for (const rule of TOPIC_RULES) {
    if (rule.matchers.some((matcher) => haystack.includes(matcher))) {
      return rule.topic;
    }
  }

  return "Other";
}

async function fetchArbeitnowJobs() {
  const jobs: ArbeitnowJob[] = [];
  let page = 1;
  let nextUrl: string | null = "https://www.arbeitnow.com/api/job-board-api?page=1";

  while (nextUrl && page <= ARBEITNOW_MAX_PAGES) {
    const res = await fetch(nextUrl, {
      headers: {
        "User-Agent": "JobPulse Worker/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Arbeitnow API error: ${res.status}`);
    }

    const payload = (await res.json()) as ArbeitnowResponse;
    const pageJobs = payload.data ?? [];

    jobs.push(...pageJobs);
    console.log(
      `Fetched ${pageJobs.length} jobs from Arbeitnow page ${
        payload.meta?.current_page ?? page
      }`,
    );

    nextUrl = payload.links?.next ?? null;
    page += 1;
  }

  return jobs;
}

async function syncArbeitnowJobs() {
  console.log(`[${new Date().toISOString()}] Polling Arbeitnow API...`);

  const jobs = await fetchArbeitnowJobs();
  const seenAt = new Date().toISOString();

  console.log(`Fetched ${jobs.length} total jobs from Arbeitnow`);

  const rows = jobs.map((job) => ({
    source: "arbeitnow",
    source_job_id: job.slug,
    source_slug: job.slug,
    remotive_id: null,
    title: job.title,
    company_name: job.company_name,
    category: normalizeTopic(job),
    tags: job.tags ?? [],
    job_type: job.job_types?.join(", ") || null,
    url: job.url,
    salary: null,
    location: job.location || (job.remote ? "Remote" : null),
    remote: job.remote,
    description_html: job.description || null,
    publication_date: new Date(job.created_at * 1000).toISOString(),
    company_logo: null,
    is_active: true,
    last_seen_at: seenAt,
    archived_at: null,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "source,source_job_id" });

    if (error) {
      console.error(`Upsert error (batch ${i}): ${error.message}`);
    } else {
      console.log(`Upserted batch ${i}-${i + batch.length - 1}`);
    }
  }

  const seenJobIds = new Set(rows.map((job) => job.source_job_id));
  const { data: activeArbeitnowRows, error: activeArbeitnowRowsError } =
    await supabase
      .from("jobs")
      .select("id, source_job_id")
      .eq("source", "arbeitnow")
      .eq("is_active", true);

  if (activeArbeitnowRowsError) {
    console.error(
      `Archive preparation error for arbeitnow jobs: ${activeArbeitnowRowsError.message}`,
    );
  } else {
    const rowsToArchive = (activeArbeitnowRows ?? [])
      .filter((row) => !seenJobIds.has(row.source_job_id))
      .map((row) => row.id);

    for (let i = 0; i < rowsToArchive.length; i += 100) {
      const batch = rowsToArchive.slice(i, i + 100);
      const { error } = await supabase
        .from("jobs")
        .update({
          is_active: false,
          archived_at: seenAt,
        })
        .in("id", batch);

      if (error) {
        console.error(`Archive error for arbeitnow jobs: ${error.message}`);
      }
    }
  }

  const { error: archiveLegacySourceError } = await supabase
    .from("jobs")
    .update({
      is_active: false,
      archived_at: seenAt,
    })
    .neq("source", "arbeitnow")
    .eq("is_active", true);

  if (archiveLegacySourceError) {
    console.error(`Archive error for legacy sources: ${archiveLegacySourceError.message}`);
  }

  console.log(`[${new Date().toISOString()}] Poll complete.`);
}

async function pollJobs() {
  try {
    switch (JOB_SOURCE_PROVIDER) {
      case "arbeitnow":
        await syncArbeitnowJobs();
        break;
      default:
        throw new Error(`Unsupported JOB_SOURCE_PROVIDER: ${JOB_SOURCE_PROVIDER}`);
    }
  } catch (error) {
    console.error("Poll failed:", error);
  }
}

void pollJobs();
setInterval(() => {
  void pollJobs();
}, POLL_INTERVAL);

console.log(
  `Worker started. Provider=${JOB_SOURCE_PROVIDER}. Polling every ${
    POLL_INTERVAL / 1000
  }s`,
);
