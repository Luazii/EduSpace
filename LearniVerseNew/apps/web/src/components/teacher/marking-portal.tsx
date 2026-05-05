"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ClipboardCheck,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

function pct(mark: number, max: number) {
  return Math.round((mark / max) * 100);
}

function deadlineBadge(deadline?: number | null) {
  if (!deadline) return null;
  const now = Date.now();
  const diff = deadline - now;
  const overdue = diff < 0;
  const soonMs = 48 * 60 * 60 * 1000;
  const label = new Date(deadline).toLocaleDateString();
  if (overdue)
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700">
        Overdue · {label}
      </span>
    );
  if (diff < soonMs)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
        Due soon · {label}
      </span>
    );
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
      {label}
    </span>
  );
}

export function MarkingPortal() {
  const courses = useQuery(api.courses.listTeachingDashboard);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const assignments = useQuery(
    api.assignments.listByCourse,
    selectedCourseId
      ? { courseId: selectedCourseId as Id<"courses"> }
      : "skip",
  );

  const selectedCourse = courses?.find((c) => String(c._id) === selectedCourseId);

  if (courses === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
      </div>
    );
  }

  const totalPending = courses.reduce((s, c) => s + c.pendingGradingCount, 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="mb-10">
        <Link
          href="/teacher"
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Teacher Hub
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
              Marking
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              Marking Portal
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Grade student submissions and tests. Select a subject to see pending work.
            </p>
          </div>
          {totalPending > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black text-amber-700">
                {totalPending} submission{totalPending !== 1 ? "s" : ""} need grading
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Subject sidebar ── */}
        <aside className="space-y-2">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Subjects
          </p>
          {courses.length === 0 && (
            <p className="text-sm text-slate-400 italic">No subjects assigned.</p>
          )}
          {courses.map((course) => {
            const active = String(course._id) === selectedCourseId;
            return (
              <button
                key={course._id}
                onClick={() =>
                  setSelectedCourseId(active ? null : String(course._id))
                }
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[#7c4dff]/30 bg-[#7c4dff]/5"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-bold ${
                        active ? "text-[#7c4dff]" : "text-slate-900"
                      }`}
                    >
                      {course.courseName}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {course.courseCode}
                    </p>
                  </div>
                  {course.pendingGradingCount > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                      {course.pendingGradingCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Assignment list panel ── */}
        <div>
          {!selectedCourseId && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-24 text-center">
              <ClipboardCheck className="mb-4 h-12 w-12 text-slate-200" />
              <h3 className="font-bold text-slate-950">Select a subject</h3>
              <p className="mt-2 text-sm text-slate-500">
                Choose a subject from the left to see its assignments.
              </p>
            </div>
          )}

          {selectedCourseId && assignments === undefined && (
            <div className="flex items-center justify-center py-24">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
            </div>
          )}

          {selectedCourseId && assignments !== undefined && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {selectedCourse?.courseName} — Assignments
                </p>
                <Link
                  href={`/teacher/gradebook/${selectedCourseId}`}
                  className="text-[10px] font-black uppercase tracking-widest text-[#7c4dff] hover:underline"
                >
                  Open Gradebook →
                </Link>
              </div>

              {assignments.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
                  No assignments published for this subject yet.
                </div>
              )}

              {assignments.map((assignment) => {
                const total = assignment.latestStudentSubmissions.length;
                const graded = assignment.latestStudentSubmissions.filter(
                  (s) => typeof s.mark === "number",
                ).length;
                const pending = total - graded;
                const progress = total > 0 ? Math.round((graded / total) * 100) : 0;

                return (
                  <article
                    key={assignment._id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-950">
                            {assignment.title}
                          </h3>
                          {deadlineBadge(assignment.deadline)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>{total} student{total !== 1 ? "s" : ""} enrolled</span>
                          <span>{assignment.submissionsCount} submission{assignment.submissionsCount !== 1 ? "s" : ""}</span>
                          {assignment.maxMark && (
                            <span>Max: {assignment.maxMark} marks</span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/teacher/marking/${selectedCourseId}/${assignment._id}`}
                        className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
                          pending > 0
                            ? "bg-slate-950 text-white hover:bg-slate-800"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pending > 0 ? `Grade ${pending}` : "Review"}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>
                            {graded}/{total} graded
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              progress === 100 ? "bg-emerald-500" : "bg-[#7c4dff]"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Graded student chips (first 5) */}
                    {graded > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignment.latestStudentSubmissions
                          .filter((s) => typeof s.mark === "number")
                          .slice(0, 5)
                          .map((s) => (
                            <div
                              key={s._id}
                              className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {s.student?.fullName ?? s.student?.email ?? "Student"}
                              <span className="text-emerald-500">
                                {s.mark}/{assignment.maxMark ?? "?"}
                              </span>
                            </div>
                          ))}
                        {graded > 5 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{graded - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
