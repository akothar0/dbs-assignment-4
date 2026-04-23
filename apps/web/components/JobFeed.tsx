"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  deriveLastSyncedAt,
  formatSyncTime,
  isJobNewSince,
  jobMatchesFilters,
  parseKeywordQuery,
  parseLocationQuery,
  type Job,
  type UserPreferences,
} from "@/lib/jobs";
import { JobCard } from "@/components/JobCard";

interface JobFeedProps {
  availableCategories: string[];
  initialJobs: Job[];
  initialSavedJobIds: string[];
}

export function JobFeed({
  availableCategories,
  initialJobs,
  initialSavedJobIds,
}: JobFeedProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [savedJobIds, setSavedJobIds] = useState(initialSavedJobIds);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [usePreferenceTopicDefaults, setUsePreferenceTopicDefaults] =
    useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [liveUpdateNotice, setLiveUpdateNotice] = useState<string | null>(null);
  const [compatibilityNotice, setCompatibilityNotice] = useState<string | null>(
    null,
  );
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [lastFeedViewedSnapshot, setLastFeedViewedSnapshot] = useState<
    string | null
  >(null);

  const deferredSearchInput = useDeferredValue(searchInput);
  const deferredLocationInput = useDeferredValue(locationInput);
  const searchTerms = parseKeywordQuery(deferredSearchInput);
  const locationTerms = parseLocationQuery(deferredLocationInput);

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
        setRemoteOnly(data.remote_only ?? false);
        setSearchInput((data.keywords ?? []).join(", "));
        setLocationInput((data.preferred_locations ?? []).join(", "));
        setLastFeedViewedSnapshot(data.last_feed_viewed_at);
        setUsePreferenceTopicDefaults((data.categories ?? []).length > 0);

        if (data.compatibilityNotice) {
          const storageKey = `jobpulse-compatibility:${data.compatibilityNotice}`;

          if (!window.sessionStorage.getItem(storageKey)) {
            window.sessionStorage.setItem(storageKey, "shown");
            setCompatibilityNotice(data.compatibilityNotice);
          }
        }

        try {
          const viewedAt = new Date().toISOString();
          const patchResponse = await fetch("/api/preferences", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ last_feed_viewed_at: viewedAt }),
          });

          if (patchResponse.ok) {
            window.dispatchEvent(new CustomEvent("jobpulse:feed-viewed"));
          }
        } catch {
          // Ignore "mark viewed" failures without interrupting the feed.
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

  const preferenceCategories = (preferences?.categories ?? []).filter(
    (category) => availableCategories.includes(category),
  );

  const effectiveCategories =
    selectedCategory !== "all"
      ? [selectedCategory]
      : usePreferenceTopicDefaults
        ? preferenceCategories
        : [];

  const filteredJobs = jobs.filter((job) =>
    jobMatchesFilters(job, {
      categories: effectiveCategories,
      searchTerms,
      remoteOnly,
      locationTerms,
    }),
  );

  const newMatchingJobs = filteredJobs.filter((job) =>
    isJobNewSince(job, lastFeedViewedSnapshot),
  );

  const pinnedNewJobs = newMatchingJobs.slice(0, 5);
  const pinnedNewIds = new Set(pinnedNewJobs.map((job) => job.id));
  const allMatchJobs =
    pinnedNewJobs.length > 0
      ? filteredJobs.filter((job) => !pinnedNewIds.has(job.id))
      : filteredJobs;
  const lastSyncedAt = deriveLastSyncedAt(jobs);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const incoming = payload.new as Job;

          if (!incoming.is_active) {
            return;
          }

          setJobs((currentJobs) => {
            if (currentJobs.some((job) => job.id === incoming.id)) {
              return currentJobs;
            }

            return [incoming, ...currentJobs].slice(0, 150);
          });

          setLiveUpdateNotice("New job added to the live feed.");
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const incoming = payload.new as Job;

          setJobs((currentJobs) => {
            const existingIndex = currentJobs.findIndex(
              (job) => job.id === incoming.id,
            );

            if (!incoming.is_active) {
              if (existingIndex === -1) {
                return currentJobs;
              }

              return currentJobs.filter((job) => job.id !== incoming.id);
            }

            if (existingIndex === -1) {
              return [incoming, ...currentJobs].slice(0, 150);
            }

            return currentJobs.map((job) =>
              job.id === incoming.id ? incoming : job,
            );
          });

          setLiveUpdateNotice("Feed updated from the latest Arbeitnow sync.");
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setActionNotice(null), 3500);

    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

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

      setActionNotice(shouldSave ? "Job saved." : "Removed from saved jobs.");
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Unable to update saved jobs.",
      );
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Feed
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            New matches for you
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Based on your preferences and current filters, with fresh matches
            pinned first so you can start scanning the feed immediately.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              label: "New since last visit",
              value: newMatchingJobs.length.toString(),
            },
            {
              label: "Matching now",
              value: filteredJobs.length.toString(),
            },
            {
              label: "Saved for later",
              value: savedJobIds.length.toString(),
            },
            {
              label: "Last synced",
              value: formatSyncTime(lastSyncedAt),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {newMatchingJobs.length > 0 ? (
        <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          {newMatchingJobs.length} new{" "}
          {newMatchingJobs.length === 1 ? "job" : "jobs"} since your last visit.
        </div>
      ) : jobs.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
          You&apos;re caught up. New matches will show up here as the feed updates.
        </div>
      ) : null}

      {compatibilityNotice ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {compatibilityNotice}
        </div>
      ) : null}

      {liveUpdateNotice ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {liveUpdateNotice}
        </div>
      ) : null}

      {actionNotice ? (
        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          {actionNotice}
        </div>
      ) : null}

      <section className="sticky top-4 z-10 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Topic</span>
            <select
              value={selectedCategory}
              onChange={(event) => {
                const nextCategory = event.target.value;
                setSelectedCategory(nextCategory);
                if (nextCategory !== "all") {
                  setUsePreferenceTopicDefaults(false);
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            >
              <option value="all">
                {usePreferenceTopicDefaults && preferenceCategories.length > 0
                  ? "Saved topics"
                  : "All topics"}
              </option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Keywords</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="react, analytics, sales ops"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Location</span>
            <input
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="Berlin, Europe, Remote"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Remote only</p>
              <p className="text-xs text-slate-500">Hide non-remote roles</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={remoteOnly}
              onClick={() => setRemoteOnly((current) => !current)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                remoteOnly ? "bg-slate-950" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                  remoteOnly ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {usePreferenceTopicDefaults && preferenceCategories.length > 0 ? (
            <>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                Using saved topics
              </span>
              {preferenceCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 px-3 py-1"
                >
                  {category}
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setUsePreferenceTopicDefaults(false);
                  setSelectedCategory("all");
                }}
                className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              >
                Show all topics
              </button>
            </>
          ) : preferenceCategories.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setUsePreferenceTopicDefaults(true);
                setSelectedCategory("all");
              }}
              className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            >
              Use saved topics
            </button>
          ) : null}
        </div>
      </section>

      {jobs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-slate-950">
            No active jobs are available right now.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The worker will repopulate the feed on the next successful
            Arbeitnow sync.
          </p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-slate-950">
            No jobs match the current filters.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Clear the topic defaults, broaden your keywords, or relax the
            location filter to widen the feed.
          </p>
        </div>
      ) : (
        <>
          {pinnedNewJobs.length > 0 ? (
            <section className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Start here first
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  New for you
                </h2>
              </div>
              <div className="grid gap-4">
                {pinnedNewJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isNew
                    isSaved={savedJobIds.includes(job.id)}
                    isSaving={savingJobId === job.id}
                    onToggleSave={toggleSaved}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {allMatchJobs.length} roles ready to review
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {pinnedNewJobs.length > 0 ? "All matches" : "Current matches"}
              </h2>
            </div>

            {allMatchJobs.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-slate-950">
                  Everything matching right now is new since your last visit.
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Once you review the new section, the older backlog will show up
                  here again on your next visit.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {allMatchJobs.map((job) => (
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
        </>
      )}
    </div>
  );
}
