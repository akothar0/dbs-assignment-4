"use client";

import { useEffect, useState } from "react";
import { formatCategoryLabel, type UserPreferences } from "@/lib/jobs";

const DEFAULT_PREFERENCES: UserPreferences = {
  categories: [],
  keywords: [],
};

interface PreferencesFormProps {
  availableCategories: string[];
}

export function PreferencesForm({ availableCategories }: PreferencesFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
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

    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: effectiveCategories,
          keywords,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not save preferences.");
      }

      setNotice("Preferences saved. Your feed will use these as defaults.");
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
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
          Preference Profile
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Tune the feed to your search.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Choose the job categories you want to watch and add comma-separated
          keywords to narrow the default feed even further.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Categories
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Select any number of Remotive categories.
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
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-900 hover:bg-white hover:text-slate-950"
                }`}
              >
                {formatCategoryLabel(category)}
              </button>
            );
          })}
        </div>
      </section>

      {compatibilityNotice ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {compatibilityNotice}
        </div>
      ) : null}

      <section className="space-y-3">
        <label htmlFor="keywords" className="block text-sm font-semibold text-slate-700">
          Keywords
        </label>
        <textarea
          id="keywords"
          rows={4}
          value={keywordsInput}
          onChange={(event) => setKeywordsInput(event.target.value)}
          placeholder="react, design systems, remote, worldwide"
          className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
        />
        <p className="text-sm text-slate-500">
          Use commas to separate multiple keywords.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save preferences"}
        </button>

        {notice ? <p className="text-sm text-slate-600">{notice}</p> : null}
      </div>
    </div>
  );
}
