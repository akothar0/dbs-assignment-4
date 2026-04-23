import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPulse",
  description: "Live remote job alerts with Clerk and Supabase Realtime.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 font-sans text-slate-950">
        <ClerkProvider>
          <div className="flex min-h-full flex-col">
            <Navbar />
            {children}
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
