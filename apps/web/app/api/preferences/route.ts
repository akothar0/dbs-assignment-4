import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  deriveAvailableCategories,
  sanitizePreferenceCategories,
} from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

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
    keywords: data?.keywords ?? [],
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
  const invalidCategories = (body.categories ?? []).filter(
    (category) => !availableCategories.includes(category),
  );

  if (invalidCategories.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown categories: ${invalidCategories.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        categories: body.categories ?? [],
        keywords: body.keywords ?? [],
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
