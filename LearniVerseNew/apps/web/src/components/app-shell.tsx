"use client";

import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

const roadmap = [
  "Secure Single Sign-On for Students & Staff",
  "Real-time Academic Data Synchronization",
  "Integrated Curriculum & Assessment Tracking",
  "Centralized Admissions & Financial Management",
];

export function AppShell() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-6 rounded-4xl border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7c4dff]">
            Academic Portal
          </p>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
            Welcome to the Unified Academic Management System.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            LearniVerse provides a streamlined interface for students, faculty, and administrators 
            to engage with the curriculum, manage admissions, and track academic excellence 
            from one centralized platform.
          </p>
        </div>

        <div className="grid gap-3">
          {roadmap.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open dashboard
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900"
          >
            Create account
          </Link>
        </div>
      </div>

      <div className="rounded-4xl border border-black/10 bg-[#111827] p-8 text-white shadow-[0_20px_80px_rgba(17,24,39,0.18)]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
            System Connectivity
          </p>
          <AuthLoading>
            <p className="text-sm text-slate-300">Establishing secure academic link...</p>
          </AuthLoading>
          <Unauthenticated>
            <p className="text-sm leading-7 text-slate-300">
              Please sign in to access your personalized academic dashboard. 
              Your role-specific tools will be available once your institutional 
              credentials are verified.
            </p>
          </Unauthenticated>
          <Authenticated>
            <SignedInPanel />
          </Authenticated>
        </div>
      </div>
    </section>
  );
}

function SignedInPanel() {
  const user = useQuery(api.users.current);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
          Current user
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {user?.fullName ?? user?.email ?? "Loading profile..."}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Role: {user?.role ?? "resolving"}
        </p>
      </div>
      <p className="text-sm leading-7 text-slate-300">
        Your institutional session is now active. Access to student, faculty, 
        and administrative portals is synchronized across the entire campus ecosystem.
      </p>
    </div>
  );
}
