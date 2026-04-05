"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

type RoleGuardProps = {
  allowedRoles: Array<"admin" | "teacher" | "student" | "parent" | "warehouse_admin">;
  redirectTo?: string;
  children: React.ReactNode;
};

export function RoleGuard({
  allowedRoles,
  redirectTo = "/dashboard",
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const user = useQuery(api.users.current);

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [allowedRoles, redirectTo, router, user]);

  if (user === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-14 sm:px-10">
        <div className="w-full rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          Checking access...
        </div>
      </main>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-14 sm:px-10">
        <section className="w-full rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">
            Access restricted
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            This area isn&apos;t available for your current role.
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Your account can still use the shared student-facing experience from the dashboard and course pages.
          </p>
          <Link
            href={redirectTo}
            className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Return to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
