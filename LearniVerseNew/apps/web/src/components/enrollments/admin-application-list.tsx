"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function AdminApplicationList() {
  const applications = useQuery(api.enrollments.listForAdmin);

  if (applications === undefined) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        Loading applications...
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      {applications.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500">
          No enrollment applications yet.
        </div>
      ) : (
        applications.map((application) => (
          <article
            key={application._id}
            className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {application.student?.fullName ?? application.student?.email ?? "Student"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {application.gradeLabel ?? application.qualification?.name ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {application.status}
                </span>
                <Link
                  href={`/admin/enrollments/${application._id}`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                >
                  Review
                </Link>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Courses: {application.courses.map((course) => course?.courseName).join(", ")}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
