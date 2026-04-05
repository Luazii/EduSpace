"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export default function ProgressPage() {
  const overview = useQuery(api.progress.getOverview);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            Progress
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Assessment reporting
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            This view summarizes quiz performance and assignment grading by course using
            your live Convex activity.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview === undefined ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)] md:col-span-2 xl:col-span-3">
              Loading progress...
            </div>
          ) : overview.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500 md:col-span-2 xl:col-span-3">
              No assessment activity yet. Complete a quiz or submit an assignment to
              populate this report.
            </div>
          ) : (
            overview.map((entry) => (
              <article
                key={entry.courseId}
                className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {entry.courseCode}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {entry.courseName}
                </h2>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Quizzes: {entry.quizCount}</p>
                  <p>Attempts: {entry.attemptsCount}</p>
                  <p>Assignments: {entry.assignmentCount}</p>
                  <p>Submitted assignments: {entry.submittedAssignmentsCount}</p>
                  <p>Graded assignments: {entry.gradedAssignmentsCount}</p>
                  <p>Awaiting marks: {entry.pendingAssignmentsCount}</p>
                  <p>
                    Highest score:{" "}
                    {typeof entry.highestScore === "number" ? entry.highestScore : "No attempts"}
                  </p>
                  <p>
                    Average score:{" "}
                    {typeof entry.averageScore === "number"
                      ? entry.averageScore.toFixed(1)
                      : "No attempts"}
                  </p>
                  <p>
                    Quiz average:{" "}
                    {typeof entry.averageQuizPercent === "number"
                      ? `${entry.averageQuizPercent.toFixed(1)}%`
                      : "No attempts"}
                  </p>
                  <p>
                    Assignment average:{" "}
                    {typeof entry.averageAssignmentMark === "number"
                      ? entry.averageAssignmentMark.toFixed(1)
                      : "Awaiting grades"}
                  </p>
                  <p>
                    Assignment average percent:{" "}
                    {typeof entry.averageAssignmentPercent === "number"
                      ? `${entry.averageAssignmentPercent.toFixed(1)}%`
                      : "Awaiting grades"}
                  </p>
                  <p>
                    Published final mark:{" "}
                    {entry.finalMark
                      ? `${(entry.finalMark.overrideMark ?? entry.finalMark.computedFinalMark ?? 0).toFixed(1)}%`
                      : "Not published"}
                  </p>
                </div>
                <Link
                  href={`/courses/${entry.courseId}`}
                  className="mt-6 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                >
                  Open classroom
                </Link>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
