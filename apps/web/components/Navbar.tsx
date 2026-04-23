"use client";

import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export function Navbar() {
  const navLinks = [
    { href: "/", label: "Feed" },
    { href: "/preferences", label: "Preferences" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-slate-900 uppercase"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            JP
          </span>
          JobPulse
        </Link>

        <nav className="flex items-center gap-3">
          <Show when="signed-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                Sign up
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </div>
    </header>
  );
}
