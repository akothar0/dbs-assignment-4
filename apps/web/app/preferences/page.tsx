import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { PreferencesForm } from "@/components/PreferencesForm";

export default async function PreferencesPage() {
  const { userId } = await auth();

  if (!userId) {
    return <RedirectToSignIn />;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PreferencesForm />
    </main>
  );
}
