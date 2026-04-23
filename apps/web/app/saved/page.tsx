import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { SavedJobsList } from "@/components/SavedJobsList";
import type { Job } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

export default async function SavedJobsPage() {
  const { userId } = await auth();

  if (!userId) {
    return <RedirectToSignIn />;
  }

  const supabase = await createClient();
  const { data: savedRows, error: savedError } = await supabase
    .from("saved_jobs")
    .select("job_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedError) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)]">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Saved jobs are temporarily unavailable.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Try again after checking the deployment env vars and database
            connectivity.
          </p>
        </div>
      </main>
    );
  }

  const jobIds = (savedRows ?? []).map((row) => row.job_id);

  let jobs: Job[] = [];

  if (jobIds.length > 0) {
    const { data: jobRows, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .in("id", jobIds);

    if (jobsError) {
      return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)]">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Saved jobs are temporarily unavailable.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Try again after checking the deployment env vars and database
              connectivity.
            </p>
          </div>
        </main>
      );
    }

    const jobsById = new Map((jobRows ?? []).map((job) => [job.id, job as Job]));
    jobs = jobIds
      .map((jobId) => jobsById.get(jobId))
      .filter((job): job is Job => Boolean(job));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <SavedJobsList initialJobs={jobs} />
    </main>
  );
}
