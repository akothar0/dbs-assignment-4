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
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:px-8 lg:py-20">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                Personalized job board
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Track fresh job matches and come back to what changed.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                JobPulse keeps a live shortlist of current openings, helps you
                save the roles worth revisiting, and brings the newest matches to
                the top when you return.
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
                  label: "Save roles",
                  value: "Keep a shortlist for later review",
                },
                {
                  label: "Set defaults",
                  value: "Track the topics, locations, and keywords you want",
                },
                {
                  label: "See what changed",
                  value: "New matches stay visible when you return",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.3)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-52px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Feed preview
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  Current openings
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
                      <span
                        className={`rounded-full px-3 py-1 ${
                          job.remote
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-white"
                        }`}
                      >
                        {job.remote ? "Remote-friendly" : job.location ?? "On-site"}
                      </span>
                      {job.remote && job.location ? (
                        <span className="rounded-full bg-white px-3 py-1">
                          {job.location}
                        </span>
                      ) : null}
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
