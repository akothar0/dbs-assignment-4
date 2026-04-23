export const TOPIC_ORDER = [
  "Software Engineering",
  "Product",
  "Design",
  "Data",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
  "Customer Support",
  "HR",
  "Security",
  "Other",
] as const;

export type JobTopic = (typeof TOPIC_ORDER)[number];

export interface Job {
  id: string;
  remotive_id: number | null;
  source: string;
  source_job_id: string;
  source_slug: string | null;
  title: string;
  company_name: string;
  category: string | null;
  tags: string[];
  job_type: string | null;
  url: string;
  salary: string | null;
  location: string | null;
  remote: boolean;
  description_html: string | null;
  publication_date: string | null;
  company_logo: string | null;
  is_active: boolean;
  last_seen_at: string;
  archived_at: string | null;
  created_at: string;
}

export interface UserPreferences {
  categories: string[];
  keywords: string[];
  remote_only: boolean;
  preferred_locations: string[];
  last_feed_viewed_at: string | null;
  compatibilityNotice?: string | null;
}

export interface JobFilters {
  categories: string[];
  locationTerms: string[];
  remoteOnly: boolean;
  searchTerms: string[];
}

export const LEGACY_CATEGORY_MAP: Record<string, JobTopic> = {
  "software-dev": "Software Engineering",
  "customer-support": "Customer Support",
  "all-others": "Other",
  product: "Product",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  business: "Operations",
  data: "Data",
  devops: "Software Engineering",
  finance: "Finance",
  "human-resources": "HR",
  qa: "Software Engineering",
  writing: "Marketing",
  "Software Development": "Software Engineering",
  "Customer Service": "Customer Support",
  "Project Management": "Product",
  "AI / ML": "Data",
  "All others": "Other",
  "Human Resources": "HR",
  "Business Development": "Sales",
};

const CATEGORY_STYLES: Record<string, string> = {
  "Software Engineering": "bg-sky-100 text-sky-800 ring-sky-200",
  Product: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Design: "bg-rose-100 text-rose-800 ring-rose-200",
  Data: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  Marketing: "bg-violet-100 text-violet-800 ring-violet-200",
  Sales: "bg-orange-100 text-orange-800 ring-orange-200",
  Finance: "bg-lime-100 text-lime-800 ring-lime-200",
  Operations: "bg-slate-200 text-slate-800 ring-slate-300",
  "Customer Support": "bg-amber-100 text-amber-800 ring-amber-200",
  HR: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  Security: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  Other: "bg-stone-200 text-stone-800 ring-stone-300",
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function formatCategoryLabel(category: string | null) {
  return category ?? "Other";
}

export function getCategoryClasses(category: string | null) {
  return (
    CATEGORY_STYLES[category ?? ""] ?? "bg-slate-100 text-slate-700 ring-slate-200"
  );
}

export function formatJobDate(date: string | null) {
  if (!date) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatSyncTime(date: string | null) {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function parseKeywordQuery(query: string) {
  return query
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function parseLocationQuery(query: string) {
  return query
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function deriveAvailableCategories(
  jobs: Array<Pick<Job, "category">>,
) {
  const counts = new Map<string, number>();

  jobs.forEach((job) => {
    const category = job.category ?? "Other";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      const aOrder = TOPIC_ORDER.indexOf(a[0] as JobTopic);
      const bOrder = TOPIC_ORDER.indexOf(b[0] as JobTopic);

      if (aOrder !== -1 || bOrder !== -1) {
        return (aOrder === -1 ? TOPIC_ORDER.length : aOrder) -
          (bOrder === -1 ? TOPIC_ORDER.length : bOrder);
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([category]) => category);
}

export function sanitizePreferenceCategories(
  categories: string[],
  availableCategories: string[],
) {
  const availableSet = new Set(availableCategories);
  const sanitizedCategories: string[] = [];
  const remappedCategories: string[] = [];
  const droppedCategories: string[] = [];

  categories.forEach((category) => {
    const trimmedCategory = category.trim();

    if (!trimmedCategory) {
      return;
    }

    const mappedCategory = LEGACY_CATEGORY_MAP[trimmedCategory];
    const resolvedCategory = availableSet.has(trimmedCategory)
      ? trimmedCategory
      : mappedCategory;

    if (resolvedCategory && availableSet.has(resolvedCategory)) {
      if (!sanitizedCategories.includes(resolvedCategory)) {
        sanitizedCategories.push(resolvedCategory);
      }

      if (mappedCategory && mappedCategory !== trimmedCategory) {
        remappedCategories.push(`${trimmedCategory} -> ${mappedCategory}`);
      }

      return;
    }

    droppedCategories.push(trimmedCategory);
  });

  const noticeParts: string[] = [];

  if (remappedCategories.length > 0) {
    noticeParts.push(`Remapped: ${remappedCategories.join(", ")}.`);
  }

  if (droppedCategories.length > 0) {
    noticeParts.push(
      `Removed unavailable topics: ${droppedCategories.join(", ")}.`,
    );
  }

  return {
    categories: sanitizedCategories,
    compatibilityNotice:
      noticeParts.length > 0
        ? `Updated your saved topics to match the current JobPulse feed. ${noticeParts.join(" ")}`
        : null,
  };
}

export function sanitizePreferredLocations(locations: string[]) {
  return dedupe(
    locations
      .map((location) => location.trim())
      .filter(Boolean),
  );
}

export function jobMatchesFilters(job: Job, filters: JobFilters) {
  const normalizedCategory = job.category ?? "Other";
  const matchesCategory =
    filters.categories.length === 0 ||
    filters.categories.includes(normalizedCategory);

  if (!matchesCategory) {
    return false;
  }

  if (filters.remoteOnly && !job.remote) {
    return false;
  }

  if (filters.locationTerms.length > 0) {
    const normalizedLocation = (job.location ?? "").toLowerCase();
    const matchesLocation = filters.locationTerms.every((term) =>
      normalizedLocation.includes(term),
    );

    if (!matchesLocation) {
      return false;
    }
  }

  if (filters.searchTerms.length === 0) {
    return true;
  }

  const haystack = [
    job.title,
    job.company_name,
    normalizedCategory,
    job.location ?? "",
    job.salary ?? "",
    job.job_type ?? "",
    job.remote ? "remote" : "",
    ...(job.tags ?? []),
    stripHtml(job.description_html ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return filters.searchTerms.every((term) => haystack.includes(term));
}

export function deriveLastSyncedAt(jobs: Job[]) {
  return jobs.reduce<string | null>((latest, job) => {
    if (!latest) {
      return job.last_seen_at;
    }

    return new Date(job.last_seen_at) > new Date(latest)
      ? job.last_seen_at
      : latest;
  }, null);
}

export function getJobTimestamp(job: Job) {
  return job.publication_date ?? job.last_seen_at ?? job.created_at;
}

export function isJobNewSince(job: Job, lastFeedViewedAt: string | null) {
  if (!lastFeedViewedAt) {
    return true;
  }

  return new Date(getJobTimestamp(job)) > new Date(lastFeedViewedAt);
}
