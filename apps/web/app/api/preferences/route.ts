import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  deriveAvailableCategories,
  sanitizePreferenceCategories,
  sanitizePreferredLocations,
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

function sanitizeKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const [{ data, error }, { data: categoryRows, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("jobs").select("category").eq("is_active", true),
    ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (categoriesError) {
    return NextResponse.json({ error: categoriesError.message }, { status: 500 });
  }

  const availableCategories = deriveAvailableCategories(categoryRows ?? []);
  const sanitizedCategories = sanitizePreferenceCategories(
    data?.categories ?? [],
    availableCategories,
  );

  return NextResponse.json({
    categories: sanitizedCategories.categories,
    keywords: data?.keywords ?? DEFAULT_PREFERENCES.keywords,
    remote_only: data?.remote_only ?? DEFAULT_PREFERENCES.remote_only,
    preferred_locations: sanitizePreferredLocations(
      data?.preferred_locations ?? DEFAULT_PREFERENCES.preferred_locations,
    ),
    last_feed_viewed_at:
      data?.last_feed_viewed_at ?? DEFAULT_PREFERENCES.last_feed_viewed_at,
    compatibilityNotice: sanitizedCategories.compatibilityNotice,
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    categories?: string[];
    keywords?: string[];
    preferred_locations?: string[];
    remote_only?: boolean;
  };

  const supabase = await createClient();
  const { data: categoryRows, error: categoriesError } = await supabase
    .from("jobs")
    .select("category")
    .eq("is_active", true);

  if (categoriesError) {
    return NextResponse.json({ error: categoriesError.message }, { status: 500 });
  }

  const availableCategories = deriveAvailableCategories(categoryRows ?? []);
  const normalizedCategories = body.categories ?? [];
  const invalidCategories = normalizedCategories.filter(
    (category) => !availableCategories.includes(category),
  );

  if (invalidCategories.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown topics: ${invalidCategories.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        categories: normalizedCategories,
        keywords: sanitizeKeywords(body.keywords ?? []),
        remote_only: body.remote_only ?? false,
        preferred_locations: sanitizePreferredLocations(
          body.preferred_locations ?? [],
        ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    last_feed_viewed_at?: string | null;
  };

  if (body.last_feed_viewed_at !== null && !body.last_feed_viewed_at) {
    return NextResponse.json(
      { error: "last_feed_viewed_at must be an ISO string or null" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        last_feed_viewed_at: body.last_feed_viewed_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
