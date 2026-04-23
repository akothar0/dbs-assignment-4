import { auth } from "@clerk/nextjs/server";
import { JobFeed } from "@/components/JobFeed";
import { LandingPage } from "@/components/LandingPage";
import type { Job } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const { userId } = await auth();
  const supabase = await createClient();

  if (!userId) {
    const { data: previewJobs } = await supabase
      .from("jobs")
      .select("*")
      .order("publication_date", { ascending: false })
      .limit(6);

    return <LandingPage previewJobs={(previewJobs ?? []) as Job[]} />;
  }

  const [{ data: jobs, error: jobsError }, { data: savedJobs, error: savedError }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .order("publication_date", { ascending: false })
        .limit(150),
      supabase.from("saved_jobs").select("job_id").eq("user_id", userId),
    ]);

  if (jobsError || savedError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="max-w-lg rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">
            Feed unavailable
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Supabase could not load the current jobs.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Check the project env vars and database connectivity, then refresh
            the page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <JobFeed
        initialJobs={(jobs ?? []) as Job[]}
        initialSavedJobIds={(savedJobs ?? []).map((entry) => entry.job_id)}
      />
    </main>
  );
}
