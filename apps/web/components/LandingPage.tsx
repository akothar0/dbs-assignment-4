"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { formatCategoryLabel, formatJobDate, type Job } from "@/lib/jobs";

interface LandingPageProps {
  previewJobs: Job[];
}

export function LandingPage({ previewJobs }: LandingPageProps) {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.18),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#eef4fb_100%)]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:px-8 lg:py-20">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                Real-time Remote Job Board
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Track remote roles as they land, not hours later.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                JobPulse polls Remotive, stores jobs in Supabase, and delivers a
                live board with saved searches, personal filters, and fast
                bookmarking.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <SignUpButton mode="modal">
                <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Create account
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950">
                  Sign in
                </button>
              </SignInButton>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Live inserts",
                  value: "Supabase Realtime",
                },
                {
                  label: "Auth",
                  value: "Clerk user sessions",
                },
                {
                  label: "Worker cadence",
                  value: "6 hour Remotive sync",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_90px_-52px_rgba(15,23,42,0.55)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Feed preview
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  Recent openings
                </h2>
              </div>
              <Link
                href="/"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
              >
                Read only
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {previewJobs.length === 0 ? (
                <div className="rounded-[24px] bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  No preview jobs are available yet.
                </div>
              ) : (
                previewJobs.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {job.company_name}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                          {job.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {formatCategoryLabel(job.category)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-3 py-1">
                        {job.location ?? "Remote"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {formatJobDate(job.publication_date)}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
