"use client";

import { useState } from "react";
import { JobCard } from "@/components/JobCard";
import type { Job } from "@/lib/jobs";

interface SavedJobsListProps {
  initialJobs: Job[];
}

export function SavedJobsList({ initialJobs }: SavedJobsListProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleToggleSave(jobId: string, shouldSave: boolean) {
    if (shouldSave) {
      return;
    }

    setSavingJobId(jobId);
    setNotice(null);

    try {
      const response = await fetch("/api/saved-jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not update saved jobs.");
      }

      setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
      setNotice("Job removed from your saved list.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update saved jobs.",
      );
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
          Saved
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Your shortlist.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Keep the jobs you want to revisit, even after a listing drops out of
          the active feed.
        </p>
      </section>

      {notice ? (
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
          {notice}
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-slate-950">
            No saved jobs yet.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Browse the feed and bookmark jobs you&apos;re interested in.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isArchived={!job.is_active}
              isSaved
              isSaving={savingJobId === job.id}
              archivedMessage="This listing has been archived from the live feed, but you can keep it here for reference."
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
