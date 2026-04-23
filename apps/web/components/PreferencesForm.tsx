"use client";

import { useEffect, useState } from "react";
import { formatCategoryLabel, type UserPreferences } from "@/lib/jobs";

const DEFAULT_PREFERENCES: UserPreferences = {
  categories: [],
  keywords: [],
  remote_only: false,
  preferred_locations: [],
  last_feed_viewed_at: null,
};

interface PreferencesFormProps {
  availableCategories: string[];
}

export function PreferencesForm({ availableCategories }: PreferencesFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [compatibilityNotice, setCompatibilityNotice] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences");
        const data = response.ok
          ? ((await response.json()) as UserPreferences)
          : DEFAULT_PREFERENCES;

        if (cancelled) {
          return;
        }

        setCategories(data.categories ?? []);
        setKeywordsInput((data.keywords ?? []).join(", "));
        setLocationsInput((data.preferred_locations ?? []).join(", "));
        setRemoteOnly(data.remote_only ?? false);

        if (data.compatibilityNotice) {
          const storageKey = `jobpulse-compatibility:${data.compatibilityNotice}`;

          if (!window.sessionStorage.getItem(storageKey)) {
            window.sessionStorage.setItem(storageKey, "shown");
            setCompatibilityNotice(data.compatibilityNotice);
          }
        }
      } catch {
        if (!cancelled) {
          setNotice("Preferences could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveCategories = categories.filter((category) =>
    availableCategories.includes(category),
  );

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setNotice(null);

    const keywords = keywordsInput
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    const preferred_locations = locationsInput
      .split(",")
      .map((location) => location.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: effectiveCategories,
          keywords,
          preferred_locations,
          remote_only: remoteOnly,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not save preferences.");
      }

      setNotice("Preferences saved. The feed will start from these defaults.");
      setCompatibilityNotice(null);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save preferences.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
        <p className="text-sm font-medium text-slate-600">
          Loading your preferences...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
          Feed Defaults
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Choose what should show up first.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Save the topics, keywords, and location signals that should shape your
          default JobPulse feed every time you come back.
        </p>
      </div>

      <section className="grid gap-6 rounded-[28px] border border-slate-200 bg-slate-50 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Topics to track
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick the workstreams you want JobPulse to prioritize.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {availableCategories.map((category) => {
              const active = effectiveCategories.includes(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-950"
                  }`}
                >
                  {formatCategoryLabel(category)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <label className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Remote-first matches
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Only keep roles marked as remote-friendly in your default
                  results.
                </p>
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

          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Preferred locations
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use cities, countries, or regions. Separate multiple entries with
              commas.
            </p>
            <input
              value={locationsInput}
              onChange={(event) => setLocationsInput(event.target.value)}
              placeholder="Berlin, Europe, Remote"
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      {compatibilityNotice ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {compatibilityNotice}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <label className="space-y-3">
          <span className="block text-sm font-semibold text-slate-700">
            Keywords
          </span>
          <textarea
            rows={4}
            value={keywordsInput}
            onChange={(event) => setKeywordsInput(event.target.value)}
            placeholder="react, product analytics, security clearance"
            className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <span className="text-sm text-slate-500">
            Use commas to separate multiple keywords.
          </span>
        </label>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            What these defaults do
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Topics narrow the feed to the kinds of roles you want to scan.</p>
            <p>Keywords help surface the tools, domains, or seniority you care about.</p>
            <p>Location and remote filters keep the shortlist relevant before you start browsing.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save defaults"}
        </button>

        {notice ? <p className="text-sm text-slate-600">{notice}</p> : null}
      </div>
    </div>
  );
}
