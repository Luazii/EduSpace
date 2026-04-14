"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  Award,
  Upload,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import Link from "next/link";

// ── status helpers ──────────────────────────────────────────────────────────

function submissionBadge(
  hasSubmission: boolean,
  isGraded: boolean,
  isOverdue: boolean,
  mark?: number,
  maxMark?: number,
) {
  if (isGraded && mark != null) {
    const pct = maxMark ? Math.round((mark / maxMark) * 100) : null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
        <Award className="h-2.5 w-2.5" />
        {mark}{maxMark ? `/${maxMark}` : ""}{pct != null ? ` (${pct}%)` : ""}
      </span>
    );
  }
  if (hasSubmission) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-sky-700">
        <CheckCircle2 className="h-2.5 w-2.5" /> Submitted
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-rose-700">
        <AlertCircle className="h-2.5 w-2.5" /> Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
      <Clock className="h-2.5 w-2.5" /> Pending
    </span>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const currentUser = useQuery(api.users.current);
  const myAssignments = useQuery(api.assignments.listMine);
  const isTeacherRole = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const gradingQueueRaw = useQuery(api.submissions.listNeedsGrading);
  const gradingQueue: FunctionReturnType<typeof api.submissions.listNeedsGrading> | undefined =
    isTeacherRole ? gradingQueueRaw : undefined;

  if (myAssignments === undefined || currentUser === undefined || currentUser === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  const isTeacher = isTeacherRole ?? false;

  // For students: split into pending / submitted / graded
  const pending = (myAssignments ?? []).filter(
    (a) => !a.mySubmission && !a.isOverdue,
  );
  const overdue = (myAssignments ?? []).filter(
    (a) => !a.mySubmission && a.isOverdue,
  );
  const submitted = (myAssignments ?? []).filter(
    (a) => a.mySubmission && typeof a.mySubmission.mark !== "number",
  );
  const graded = (myAssignments ?? []).filter(
    (a) => a.mySubmission && typeof a.mySubmission.mark === "number",
  );

  // ── Teacher / Admin view ──────────────────────────────────────────────────

  if (isTeacher) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14 sm:px-10">
        <header className="mb-12">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
            Academic Management
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Assignments
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
            Review submitted work and manage the grading queue across all your
            courses.
          </p>
        </header>

        {/* Stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Needs Grading
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">
              {gradingQueue?.length ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Total Assignments
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">
              {myAssignments?.length ?? 0}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-white/50">
              Courses with Work
            </p>
            <p className="mt-2 text-4xl font-black">
              {new Set(myAssignments?.map((a) => a.courseId)).size}
            </p>
          </div>
        </div>

        {/* Grading queue */}
        {!gradingQueue || gradingQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-300" />
            <h3 className="font-bold text-slate-950">All Caught Up!</h3>
            <p className="mt-2 text-sm text-slate-500">
              No submissions pending grading right now.
            </p>
          </div>
        ) : (
          <section>
            <h2 className="mb-5 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              Pending Grading ({gradingQueue.length})
            </h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {(gradingQueue ?? []).map((sub) => (
                <div
                  key={sub._id}
                  className="flex items-start justify-between gap-4 p-6"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400">
                      {sub.course?.courseName ?? "Unknown Course"}
                    </p>
                    <h3 className="mt-0.5 font-bold text-slate-950">
                      {sub.assignment?.title ?? "Assignment"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {sub.student?.fullName ?? sub.student?.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted{" "}
                      {formatDistanceToNow(sub.submittedAt, { addSuffix: true })}
                      {sub.assignment?.deadline && (
                        <>
                          {" · "}
                          {isPast(sub.assignment.deadline) ? (
                            <span className="text-rose-500">
                              Deadline passed{" "}
                              {formatDistanceToNow(sub.assignment.deadline, {
                                addSuffix: true,
                              })}
                            </span>
                          ) : (
                            `Due ${format(sub.assignment.deadline, "MMM d")}`
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  {sub.url && (
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {sub.fileName}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ── Student view ──────────────────────────────────────────────────────────

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          My Learning
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Assignments
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          View all your assignments, track deadlines, and check your grades.
        </p>
      </header>

      {/* Summary stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Pending", value: pending.length, color: "bg-amber-50 text-amber-700 border-amber-100" },
          { label: "Overdue", value: overdue.length, color: overdue.length > 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-50 text-slate-500 border-slate-100" },
          { label: "Submitted", value: submitted.length, color: "bg-sky-50 text-sky-700 border-sky-100" },
          { label: "Graded", value: graded.length, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-3xl border p-5 ${color}`}>
            <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="mt-1.5 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {(myAssignments ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-slate-200" />
          <h3 className="font-bold text-slate-950">No Assignments Yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Your assignments will appear here once your teacher publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {overdue.length > 0 && (
            <AssignmentSection
              title="Overdue"
              assignments={overdue}
              highlightClass="border-rose-200 bg-rose-50/30"
            />
          )}
          {pending.length > 0 && (
            <AssignmentSection title="Due Soon" assignments={pending} />
          )}
          {submitted.length > 0 && (
            <AssignmentSection title="Submitted — Awaiting Grade" assignments={submitted} />
          )}
          {graded.length > 0 && (
            <AssignmentSection title="Graded" assignments={graded} muted />
          )}
        </div>
      )}
    </main>
  );
}

// ── Section component ────────────────────────────────────────────────────────

type AssignmentItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.assignments.listMine>>
>[number];

function AssignmentSection({
  title,
  assignments,
  highlightClass,
  muted,
}: {
  title: string;
  assignments: AssignmentItem[];
  highlightClass?: string;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "opacity-75" : undefined}>
      <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
        {title} ({assignments.length})
      </h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {assignments.map((a) => {
          const hasGrade = typeof a.mySubmission?.mark === "number";
          const pct =
            hasGrade && a.maxMark
              ? Math.round((a.mySubmission!.mark! / a.maxMark) * 100)
              : null;

          return (
            <Link
              key={a._id}
              href={`/courses/${a.courseId}`}
              className={`group flex items-start justify-between gap-4 p-6 transition hover:bg-slate-50 ${highlightClass ?? ""}`}
            >
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400">{a.courseName}</p>
                <h3 className="mt-0.5 font-bold text-slate-950 group-hover:text-[#7c4dff] transition-colors">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                    {a.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {submissionBadge(
                    !!a.mySubmission,
                    hasGrade,
                    a.isOverdue,
                    a.mySubmission?.mark ?? undefined,
                    a.maxMark,
                  )}
                  {a.deadline && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {isPast(a.deadline)
                        ? `Was due ${format(a.deadline, "MMM d")}`
                        : `Due ${format(a.deadline, "MMM d, p")}`}
                    </span>
                  )}
                  {a.maxMark && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Award className="h-2.5 w-2.5" />
                      Out of {a.maxMark}
                    </span>
                  )}
                </div>
                {a.mySubmission?.feedback && (
                  <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs leading-relaxed text-slate-600">
                    <span className="font-bold text-violet-700">
                      Teacher feedback:{" "}
                    </span>
                    {a.mySubmission.feedback}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {!a.mySubmission && (
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600 group-hover:border-[#7c4dff]/20 group-hover:bg-[#7c4dff]/5 group-hover:text-[#7c4dff] transition-colors">
                    <Upload className="h-3 w-3" />
                    Submit
                  </div>
                )}
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#7c4dff] transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
