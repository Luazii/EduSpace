"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function TeacherReportsIndex() {
  const courses = useQuery(api.reports.listCourses);

  const totals =
    courses === undefined
      ? null
      : courses.reduce(
          (summary, course) => {
            summary.courses += 1;
            summary.students += course.studentCount;
            summary.published += course.publishedFinalMarksCount;
            summary.atRisk += course.atRiskCount;
            return summary;
          },
          {
            courses: 0,
            students: 0,
            published: 0,
            atRisk: 0,
          },
        );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Teacher reports
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Final marks and course performance
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Review course-level assessment health, spot at-risk learners, and open a
                detailed report to save or publish final marks.
              </p>
            </div>
            <Link
              href="/teacher"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Back to teacher hub
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Courses" value={totals ? String(totals.courses) : "..."} />
            <StatCard label="Learners" value={totals ? String(totals.students) : "..."} />
            <StatCard
              label="Published marks"
              value={totals ? String(totals.published) : "..."}
            />
            <StatCard label="At risk" value={totals ? String(totals.atRisk) : "..."} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {courses === undefined ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)] md:col-span-2">
              Loading teacher reports...
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500 md:col-span-2">
              No courses are ready for reporting yet.
            </div>
          ) : (
            courses.map((course) => (
              <article
                key={course._id}
                className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {course.courseCode}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {course.courseName}
                </h2>
                <p className="mt-2 text-sm text-slate-500">{course.department}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>Learners: {course.studentCount}</p>
                  <p>Published: {course.publishedFinalMarksCount}</p>
                  <p>Drafts: {course.draftFinalMarksCount}</p>
                  <p>At risk: {course.atRiskCount}</p>
                  <p>
                    Average final mark:{" "}
                    {typeof course.averageFinalMark === "number"
                      ? `${course.averageFinalMark.toFixed(1)}%`
                      : "No mark yet"}
                  </p>
                  <p>Ready to publish: {course.readyToPublishCount}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/teacher/reports/${course._id}`}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open report
                  </Link>
                  <Link
                    href={`/courses/${course._id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                  >
                    Open classroom
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </article>
  );
}
