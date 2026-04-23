"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { href: "/", label: "Feed" },
    { href: "/saved", label: "Saved Jobs" },
    { href: "/preferences", label: "Preferences" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-slate-900 uppercase"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            JP
          </span>
          JobPulse
        </Link>

        <div className="flex items-center gap-3">
          <Show when="signed-in">
            <div className="md:hidden">
              <UserButton />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 md:hidden"
            >
              Menu
            </button>
          </Show>

          <nav className="hidden items-center gap-3 md:flex">
            <Show when="signed-in">
              {navLinks.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
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

        <div className="w-full md:hidden">
          <Show when="signed-in">
            {menuOpen ? (
              <nav className="grid gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                {navLinks.map((link) => {
                  const active = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </Show>

          <Show when="signed-out">
            <div className="flex flex-wrap gap-3">
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
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
