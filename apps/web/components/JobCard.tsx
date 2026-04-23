"use client";

import { formatCategoryLabel, formatJobDate, getCategoryClasses, type Job } from "@/lib/jobs";

interface JobCardProps {
  isSaved: boolean;
  isSaving: boolean;
  job: Job;
  onToggleSave: (jobId: string, shouldSave: boolean) => Promise<void>;
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6.75 4.75h10.5a1 1 0 0 1 1 1v13.5l-6.25-3.75-6.25 3.75V5.75a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JobCard({
  isSaved,
  isSaving,
  job,
  onToggleSave,
}: JobCardProps) {
  return (
    <article className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)] sm:grid-cols-[auto_1fr_auto]">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {job.company_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.company_logo}
            alt={`${job.company_name} logo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-slate-500">
            {job.company_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {job.company_name}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {job.title}
            </h2>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getCategoryClasses(job.category)}`}
          >
            {formatCategoryLabel(job.category)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {job.location ?? "Remote"}
          </span>
          {job.job_type ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {job.job_type.replaceAll("_", " ")}
            </span>
          ) : null}
          {job.salary ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.salary}</span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {formatJobDate(job.publication_date)}
          </span>
        </div>

        {job.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {job.tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-between gap-4 sm:items-end">
        <button
          type="button"
          onClick={() => onToggleSave(job.id, !isSaved)}
          disabled={isSaving}
          className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            isSaved
              ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
              : "border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-950"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <BookmarkIcon filled={isSaved} />
          {isSaved ? "Saved" : "Save"}
        </button>

        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-sky-700"
        >
          View job
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
