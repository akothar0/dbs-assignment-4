import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { deriveAvailableCategories } from "@/lib/jobs";
import { PreferencesForm } from "@/components/PreferencesForm";
import { createClient } from "@/utils/supabase/server";

export default async function PreferencesPage() {
  const { userId } = await auth();

  if (!userId) {
    return <RedirectToSignIn />;
  }

  const supabase = await createClient();
  const { data: categoryRows } = await supabase
    .from("jobs")
    .select("category")
    .eq("is_active", true);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PreferencesForm
        availableCategories={deriveAvailableCategories(categoryRows ?? [])}
      />
    </main>
  );
}
