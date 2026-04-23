"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  JOB_CATEGORIES,
  jobMatchesFilters,
  parseKeywordQuery,
  type Job,
  type UserPreferences,
} from "@/lib/jobs";
import { JobCard } from "@/components/JobCard";

interface JobFeedProps {
  initialJobs: Job[];
  initialSavedJobIds: string[];
}

export function JobFeed({ initialJobs, initialSavedJobIds }: JobFeedProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [savedJobIds, setSavedJobIds] = useState(initialSavedJobIds);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  const deferredSearchInput = useDeferredValue(searchInput);
  const searchTerms = parseKeywordQuery(deferredSearchInput);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as UserPreferences;

        if (cancelled) {
          return;
        }

        setPreferences(data);

        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0]);
        }

        if (data.keywords.length > 0) {
          setSearchInput(data.keywords.join(", "));
        }
      } catch {
        // Ignore transient preference fetch failures in the client.
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const incoming = payload.new as Job;

          setJobs((currentJobs) => {
            if (currentJobs.some((job) => job.id === incoming.id)) {
              return currentJobs;
            }

            return [incoming, ...currentJobs];
          });

          setNotice("New job just posted!");
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 3500);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const filteredJobs = jobs.filter((job) =>
    jobMatchesFilters(job, selectedCategory, searchTerms),
  );

  async function toggleSaved(jobId: string, shouldSave: boolean) {
    setSavingJobId(jobId);

    try {
      const response = await fetch("/api/saved-jobs", {
        method: shouldSave ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not update saved jobs.");
      }

      setSavedJobIds((currentIds) =>
        shouldSave
          ? Array.from(new Set([...currentIds, jobId]))
          : currentIds.filter((id) => id !== jobId),
      );

      setNotice(shouldSave ? "Job saved." : "Job removed from saved jobs.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to update saved jobs.",
      );
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Live Remote Feed
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Fresh remote roles, filtered to the work you actually want.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            JobPulse streams new Remotive postings into Supabase, then keeps
            your feed current with live inserts and personal filters.
          </p>
        </div>

        <div className="grid gap-4 rounded-[28px] bg-slate-950 p-5 text-white sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Loaded jobs
            </p>
            <p className="mt-2 text-3xl font-semibold">{jobs.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Saved
            </p>
            <p className="mt-2 text-3xl font-semibold">{savedJobIds.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Default mode
            </p>
            <p className="mt-2 text-lg font-semibold">
              {preferences?.categories.length ? "Preference-aware" : "All roles"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] md:grid-cols-[220px_1fr]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          >
            <option value="all">All categories</option>
            {JOB_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Keyword search
          </span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="react, design systems, worldwide"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
        </label>
      </section>

      {preferences?.categories.length || preferences?.keywords.length ? (
        <section className="flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
            Defaults loaded from your preferences
          </span>
          {preferences.categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-slate-200 px-3 py-1"
            >
              {category}
            </span>
          ))}
          {preferences.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-slate-200 px-3 py-1"
            >
              {keyword}
            </span>
          ))}
        </section>
      ) : null}

      {notice ? (
        <div className="inline-flex items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
          {notice}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Showing {filteredJobs.length} matching roles
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Current opportunities
            </h2>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="text-xl font-semibold text-slate-950">
              No jobs match the current filters.
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clear the category or broaden your keywords to widen the feed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.includes(job.id)}
                isSaving={savingJobId === job.id}
                onToggleSave={toggleSaved}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
