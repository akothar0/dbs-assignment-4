import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: savedRows, error: savedError } = await supabase
    .from("saved_jobs")
    .select("job_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedError) {
    return NextResponse.json({ error: savedError.message }, { status: 500 });
  }

  const jobIds = (savedRows ?? []).map((row) => row.job_id);

  if (jobIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .in("id", jobIds);

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  const jobsById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const orderedJobs = jobIds
    .map((jobId) => jobsById.get(jobId))
    .filter(Boolean);

  return NextResponse.json(orderedJobs);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = (await request.json()) as { jobId?: string };

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("saved_jobs").insert({
    user_id: userId,
    job_id: jobId,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = (await request.json()) as { jobId?: string };

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", userId)
    .eq("job_id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
