import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  deriveAvailableCategories,
  isJobNewSince,
  jobMatchesFilters,
  sanitizePreferenceCategories,
  type Job,
  type UserPreferences,
} from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_PREFERENCES: UserPreferences = {
  categories: [],
  keywords: [],
  remote_only: false,
  preferred_locations: [],
  last_feed_viewed_at: null,
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ unseenCount: 0 });
  }

  const supabase = await createClient();
  const [{ data: preferences }, { data: jobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("jobs").select("*").eq("is_active", true),
    ]);

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  const availableCategories = deriveAvailableCategories((jobs ?? []) as Job[]);
  const sanitizedCategories = sanitizePreferenceCategories(
    preferences?.categories ?? DEFAULT_PREFERENCES.categories,
    availableCategories,
  );

  const filters = {
    categories: sanitizedCategories.categories,
    searchTerms: (preferences?.keywords ?? DEFAULT_PREFERENCES.keywords).map(
      (keyword: string) => keyword.trim().toLowerCase(),
    ),
    remoteOnly: preferences?.remote_only ?? DEFAULT_PREFERENCES.remote_only,
    locationTerms: (
      preferences?.preferred_locations ?? DEFAULT_PREFERENCES.preferred_locations
    ).map((location: string) => location.trim().toLowerCase()),
  };

  const unseenCount = ((jobs ?? []) as Job[]).filter(
    (job) =>
      jobMatchesFilters(job, filters) &&
      isJobNewSince(
        job,
        preferences?.last_feed_viewed_at ??
          DEFAULT_PREFERENCES.last_feed_viewed_at,
      ),
  ).length;

  return NextResponse.json({
    unseenCount,
    lastFeedViewedAt:
      preferences?.last_feed_viewed_at ?? DEFAULT_PREFERENCES.last_feed_viewed_at,
  });
}
