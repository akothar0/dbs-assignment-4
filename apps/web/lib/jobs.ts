export interface Job {
  id: string;
  remotive_id: number;
  title: string;
  company_name: string;
  category: string | null;
  tags: string[];
  job_type: string | null;
  url: string;
  salary: string | null;
  location: string | null;
  publication_date: string | null;
  company_logo: string | null;
  created_at: string;
}

export interface UserPreferences {
  categories: string[];
  keywords: string[];
}

export const JOB_CATEGORIES = [
  "software-dev",
  "customer-support",
  "design",
  "marketing",
  "sales",
  "product",
  "business",
  "data",
  "devops",
  "finance",
  "human-resources",
  "qa",
  "writing",
  "all-others",
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  "software-dev": "bg-sky-100 text-sky-800 ring-sky-200",
  "customer-support": "bg-amber-100 text-amber-800 ring-amber-200",
  design: "bg-rose-100 text-rose-800 ring-rose-200",
  marketing: "bg-violet-100 text-violet-800 ring-violet-200",
  sales: "bg-orange-100 text-orange-800 ring-orange-200",
  product: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  business: "bg-slate-200 text-slate-800 ring-slate-300",
  data: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  devops: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  finance: "bg-lime-100 text-lime-800 ring-lime-200",
  "human-resources": "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  qa: "bg-teal-100 text-teal-800 ring-teal-200",
  writing: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  "all-others": "bg-stone-200 text-stone-800 ring-stone-300",
};

export function formatCategoryLabel(category: string | null) {
  if (!category) {
    return "General";
  }

  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export function parseKeywordQuery(query: string) {
  return query
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function jobMatchesFilters(
  job: Job,
  category: string,
  searchTerms: string[],
) {
  const matchesCategory =
    category === "all" || (job.category ?? "all-others") === category;

  if (!matchesCategory) {
    return false;
  }

  if (searchTerms.length === 0) {
    return true;
  }

  const haystack = [
    job.title,
    job.company_name,
    job.category ?? "",
    job.location ?? "",
    job.salary ?? "",
    ...(job.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return searchTerms.every((term) => haystack.includes(term));
}
