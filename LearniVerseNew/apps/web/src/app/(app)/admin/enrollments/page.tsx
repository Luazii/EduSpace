import Link from "next/link";

import { AdminApplicationList } from "@/components/enrollments/admin-application-list";

export default function AdminEnrollmentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Admin review
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Enrollment applications
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Review submitted applications, inspect NSC data, and approve or reject candidates.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Back to admin
            </Link>
          </div>
        </section>
        <AdminApplicationList />
      </div>
    </main>
  );
}
