"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Send,
  CheckCircle2,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  HelpCircle,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";

/* ── NSC level helper ─────────────────────────────────────────── */
function nscLevel(pct: number | null | undefined) {
  if (pct == null) return { level: 0, label: "Pending", short: "—", bg: "bg-slate-100", text: "text-slate-400", bar: "bg-slate-200" };
  if (pct >= 80) return { level: 7, label: "Outstanding", short: "L7", bg: "bg-emerald-100", text: "text-emerald-800", bar: "bg-emerald-500" };
  if (pct >= 70) return { level: 6, label: "Meritorious", short: "L6", bg: "bg-sky-100", text: "text-sky-800", bar: "bg-sky-500" };
  if (pct >= 60) return { level: 5, label: "Substantial", short: "L5", bg: "bg-blue-100", text: "text-blue-800", bar: "bg-blue-500" };
  if (pct >= 50) return { level: 4, label: "Adequate", short: "L4", bg: "bg-violet-100", text: "text-violet-800", bar: "bg-violet-500" };
  if (pct >= 40) return { level: 3, label: "Moderate", short: "L3", bg: "bg-amber-100", text: "text-amber-800", bar: "bg-amber-400" };
  if (pct >= 30) return { level: 2, label: "Elementary", short: "L2", bg: "bg-orange-100", text: "text-orange-800", bar: "bg-orange-400" };
  return { level: 1, label: "Not Achieved", short: "L1", bg: "bg-rose-100", text: "text-rose-800", bar: "bg-rose-500" };
}

function ProgressBar({ value, barClass }: { value: number; barClass: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-2 rounded-full transition-all ${barClass}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export default function ParentStudentReportPage() {
  const params = useParams();
  const studentId = params.id as Id<"users">;

  const report = useQuery(api.marks.getStudentFullReport, { studentUserId: studentId });
  const addReportComment = useMutation(api.parentServices.addReportComment);
  const addSubmissionComment = useMutation(api.parentServices.addSubmissionComment);
  const addQuizAttemptComment = useMutation(api.parentServices.addQuizAttemptComment);

  // Track which item has the active comment box open: "report:{finalMarkId}", "sub:{submissionId}", "quiz:{attemptId}"
  const [activeCommentKey, setActiveCommentKey] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const openComment = (key: string) => {
    setActiveCommentKey(activeCommentKey === key ? null : key);
    setCommentText("");
  };

  const submitComment = async () => {
    if (!activeCommentKey || !commentText.trim()) return;
    setIsSubmitting(true);
    try {
      if (activeCommentKey.startsWith("report:")) {
        await addReportComment({ finalMarkId: activeCommentKey.slice(7) as Id<"finalMarks">, comment: commentText.trim() });
      } else if (activeCommentKey.startsWith("sub:")) {
        await addSubmissionComment({ submissionId: activeCommentKey.slice(4) as Id<"submissions">, comment: commentText.trim() });
      } else if (activeCommentKey.startsWith("quiz:")) {
        await addQuizAttemptComment({ attemptId: activeCommentKey.slice(5) as Id<"quizAttempts">, comment: commentText.trim() });
      }
      setCommentText("");
      setActiveCommentKey(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (report === undefined)
    return <div className="h-screen animate-pulse bg-slate-50" />;

  const student = report.student;
  const courses = report.courses ?? [];

  const overallAvg =
    courses.filter((c) => c?.summary.weightedFinal != null).length > 0
      ? Math.round(
          courses
            .filter((c) => c?.summary.weightedFinal != null)
            .reduce((s, c) => s + (c?.summary.weightedFinal ?? 0), 0) /
            courses.filter((c) => c?.summary.weightedFinal != null).length,
        )
      : null;

  const atRiskCount = courses.filter(
    (c) => typeof c?.summary.weightedFinal === "number" && c.summary.weightedFinal < 50,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link
            href="/parent/dashboard"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-xl font-black text-white">
              {student?.fullName?.[0] ?? "?"}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-950">{student?.fullName}</h1>
              <p className="text-sm font-medium text-slate-500">
                Student Achievement Report · {format(Date.now(), "MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-600" />
            Subject Performance
          </h2>

          {courses.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              No active subject enrolments found.
            </div>
          )}

          {courses.map((course) => {
            if (!course) return null;
            const isExpanded = expandedCourse === course.courseId;
            const final = course.finalMark?.effectiveMark ?? course.summary.weightedFinal;
            const level = nscLevel(final);
            const isAtRisk = typeof final === "number" && final < 50;
            const isCritical = typeof final === "number" && final < 40;

            return (
              <section
                key={course.courseId}
                className={`rounded-3xl border bg-white shadow-sm overflow-hidden ${
                  isCritical
                    ? "border-rose-200"
                    : isAtRisk
                    ? "border-amber-200"
                    : "border-slate-200"
                }`}
              >
                {/* Course header */}
                <div className="p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-slate-950">{course.courseName}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {course.courseCode}
                        {course.semester ? ` · Semester ${course.semester}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Assignments {course.assignmentWeight}% ·
                        Quizzes/Tests {course.quizWeight}%
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {final != null && (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${level.bg} ${level.text}`}>
                          {level.short} · {level.label}
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {course.finalMark ? "Final Mark" : "Current Mark"}
                        </p>
                        <p
                          className={`text-3xl font-black ${
                            isCritical
                              ? "text-rose-700"
                              : isAtRisk
                              ? "text-amber-700"
                              : final != null
                              ? "text-slate-950"
                              : "text-slate-300"
                          }`}
                        >
                          {final != null ? `${final}%` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for final mark */}
                  {final != null && (
                    <div className="mt-4">
                      <ProgressBar value={final} barClass={level.bar} />
                    </div>
                  )}

                  {/* At-risk warning */}
                  {isAtRisk && (
                    <div
                      className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
                        isCritical
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <TrendingDown className="h-4 w-4 shrink-0" />
                      {isCritical
                        ? "Critical: Student is at serious risk of not passing this subject."
                        : "At risk: Current mark is below the 50% pass requirement."}
                    </div>
                  )}

                  {/* Summary stats row */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat
                      label="Assignments"
                      value={
                        course.summary.avgAssignmentPct != null
                          ? `${course.summary.avgAssignmentPct}%`
                          : "—"
                      }
                    />
                    <MiniStat
                      label="Quizzes"
                      value={
                        course.summary.avgQuizPct != null
                          ? `${course.summary.avgQuizPct}%`
                          : "—"
                      }
                    />
                    <MiniStat label="Assignments" value={`${course.assignments.length} set`} />
                    <MiniStat label="Quizzes" value={`${course.quizzes.length} set`} />
                  </div>

                  {course.manualMarks && course.manualMarks.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Manual assessment record
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>
                          Captured assessments: <span className="font-bold text-slate-900">{course.manualMarks.length}</span>
                        </p>
                        <p>
                          Average:{" "}
                          <span className="font-bold text-slate-900">
                            {typeof course.summary.manualAverage === "number"
                              ? `${course.summary.manualAverage}%`
                              : "Pending"}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Teacher observation */}
                  {course.finalMark?.notes && (
                    <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-1">
                        Teacher Observation
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{course.finalMark.notes}"
                      </p>
                    </div>
                  )}

                  {/* Report-level parent comment */}
                  {course.finalMark && (() => {
                    const commentKey = `report:${course.finalMark._id}`;
                    const isOpen = activeCommentKey === commentKey;
                    return (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                            Comments on final report
                          </p>
                          <button
                            onClick={() => openComment(commentKey)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${isOpen ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                          >
                            <MessageSquare className="h-3 w-3" />
                            {isOpen ? "Cancel" : "Add comment"}
                          </button>
                        </div>
                        {(course.finalMark.parentComments?.length ?? 0) > 0 && (
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                            {course.finalMark.parentComments!.map((c, i) => (
                              <div key={i} className="text-[11px] text-slate-600">
                                <span className="font-bold text-slate-800">You · </span>
                                <span className="text-slate-400">{format(c.createdAt, "d MMM yyyy")} · </span>
                                {c.comment}
                              </div>
                            ))}
                          </div>
                        )}
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-indigo-50/40 px-4 py-3 flex gap-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && submitComment()}
                              placeholder="Comment on your child's final report…"
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                              autoFocus
                            />
                            <button
                              onClick={submitComment}
                              disabled={isSubmitting || !commentText.trim()}
                              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              {isSubmitting ? "…" : "Post"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Expand/collapse toggle */}
                  <button
                    onClick={() =>
                      setExpandedCourse(isExpanded ? null : course.courseId)
                    }
                    className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide detailed breakdown
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        View detailed breakdown
                      </>
                    )}
                  </button>
                </div>

                {/* ── Detailed breakdown (expandable) ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-7 space-y-6">
                    {/* Assignments */}
                    {course.assignments.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Assignments ({course.assignmentWeight}% weight)
                        </h4>
                        <div className="space-y-2">
                          {course.assignments.map((a) => {
                            const aLevel = nscLevel(a.percent);
                            const commentKey = a.submissionId ? `sub:${a.submissionId}` : null;
                            const isCommentOpen = commentKey && activeCommentKey === commentKey;
                            return (
                              <div
                                key={String(a._id)}
                                className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                              >
                                <div className="flex items-center justify-between px-4 py-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {a.title}
                                    </p>
                                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-slate-400">
                                      {a.deadline && (
                                        <span>Due {new Date(a.deadline).toLocaleDateString()}</span>
                                      )}
                                      {a.gradedAt && (
                                        <span>
                                          Graded {new Date(a.gradedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {a.feedback && (
                                      <p className="mt-1 text-[11px] italic text-slate-500 leading-relaxed">
                                        "{a.feedback}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-4 flex shrink-0 items-center gap-3">
                                    {a.mark != null ? (
                                      <div className="text-right">
                                        <p className="text-sm font-black text-slate-950">
                                          {a.mark}
                                          {a.maxMark ? `/${a.maxMark}` : ""}
                                        </p>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${aLevel.bg} ${aLevel.text}`}
                                        >
                                          {a.percent}%
                                        </span>
                                      </div>
                                    ) : a.submittedAt ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
                                        Awaiting grade
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-400">
                                        Not submitted
                                      </span>
                                    )}
                                    {commentKey && (
                                      <button
                                        onClick={() => openComment(commentKey)}
                                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition ${isCommentOpen ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        {(a.parentComments?.length ?? 0) > 0 ? a.parentComments!.length : ""}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Existing comments */}
                                {(a.parentComments?.length ?? 0) > 0 && (
                                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                                    {a.parentComments!.map((c, i) => (
                                      <div key={i} className="text-[11px] text-slate-600">
                                        <span className="font-bold text-slate-800">You · </span>
                                        <span className="text-slate-400">{format(c.createdAt, "d MMM yyyy")} · </span>
                                        {c.comment}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Comment input */}
                                {isCommentOpen && (
                                  <div className="border-t border-slate-100 bg-indigo-50/40 px-4 py-3 flex gap-2">
                                    <input
                                      type="text"
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                                      placeholder="Leave a comment on this assignment…"
                                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                                      autoFocus
                                    />
                                    <button
                                      onClick={submitComment}
                                      disabled={isSubmitting || !commentText.trim()}
                                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      <Send className="h-3 w-3" />
                                      {isSubmitting ? "…" : "Post"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quizzes */}
                    {course.quizzes.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                          <HelpCircle className="h-3.5 w-3.5" />
                          Quizzes &amp; Tests ({course.quizWeight}% weight)
                        </h4>
                        <div className="space-y-2">
                          {course.quizzes.map((q) => {
                            const qLevel = nscLevel(q.percent);
                            const commentKey = q.bestAttemptId ? `quiz:${q.bestAttemptId}` : null;
                            const isCommentOpen = commentKey && activeCommentKey === commentKey;
                            return (
                              <div
                                key={String(q._id)}
                                className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                              >
                                <div className="flex items-center justify-between px-4 py-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {q.title}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      {q.attemptsUsed}/{q.maxAttempts} attempts used
                                      {q.lastAttemptAt &&
                                        ` · Last attempt ${new Date(q.lastAttemptAt).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  <div className="ml-4 flex shrink-0 items-center gap-3">
                                    {q.bestScore != null ? (
                                      <div className="text-right">
                                        <p className="text-sm font-black text-slate-950">
                                          {q.bestScore}
                                          {q.maxScore ? `/${q.maxScore}` : ""}
                                        </p>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${qLevel.bg} ${qLevel.text}`}
                                        >
                                          {q.percent}% best
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-400">
                                        Not attempted
                                      </span>
                                    )}
                                    {commentKey && q.bestScore != null && (
                                      <button
                                        onClick={() => openComment(commentKey)}
                                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition ${isCommentOpen ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        {(q.parentComments?.length ?? 0) > 0 ? q.parentComments!.length : ""}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Existing comments */}
                                {(q.parentComments?.length ?? 0) > 0 && (
                                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                                    {q.parentComments!.map((c, i) => (
                                      <div key={i} className="text-[11px] text-slate-600">
                                        <span className="font-bold text-slate-800">You · </span>
                                        <span className="text-slate-400">{format(c.createdAt, "d MMM yyyy")} · </span>
                                        {c.comment}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Comment input */}
                                {isCommentOpen && (
                                  <div className="border-t border-slate-100 bg-indigo-50/40 px-4 py-3 flex gap-2">
                                    <input
                                      type="text"
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                                      placeholder="Leave a comment on this quiz result…"
                                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                                      autoFocus
                                    />
                                    <button
                                      onClick={submitComment}
                                      disabled={isSubmitting || !commentText.trim()}
                                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      <Send className="h-3 w-3" />
                                      {isSubmitting ? "…" : "Post"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Overall summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Academic Standing</h3>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Overall average
                </p>
                {overallAvg != null ? (
                  <>
                    <p className="text-4xl font-black text-slate-950">{overallAvg}%</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${nscLevel(overallAvg).bg} ${nscLevel(overallAvg).text}`}
                    >
                      {nscLevel(overallAvg).label}
                    </span>
                    <div className="mt-2">
                      <ProgressBar
                        value={overallAvg}
                        barClass={nscLevel(overallAvg).bar}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 font-bold">No marks yet</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Subjects enrolled
                </p>
                <p className="text-sm font-bold text-slate-900">{courses.length}</p>
              </div>

              {atRiskCount > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">
                    At risk
                  </p>
                  <p className="text-sm font-bold text-rose-800">
                    {atRiskCount} subject{atRiskCount !== 1 ? "s" : ""} below 50%
                  </p>
                  <p className="text-[10px] text-rose-600 mt-1">
                    Please contact the school to discuss intervention.
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Enrolment status
                </p>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active
                </p>
              </div>
            </div>
          </section>

          {/* NSC Level legend */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
              Achievement Levels
            </h4>
            <div className="space-y-1.5">
              {[
                { l: 7, label: "Outstanding", range: "80–100%" },
                { l: 6, label: "Meritorious", range: "70–79%" },
                { l: 5, label: "Substantial", range: "60–69%" },
                { l: 4, label: "Adequate", range: "50–59%" },
                { l: 3, label: "Moderate", range: "40–49%" },
                { l: 2, label: "Elementary", range: "30–39%" },
                { l: 1, label: "Not Achieved", range: "0–29%" },
              ].map((item) => {
                const lvl = nscLevel(
                  item.l === 7 ? 85 : item.l === 6 ? 75 : item.l === 5 ? 65 :
                  item.l === 4 ? 55 : item.l === 3 ? 45 : item.l === 2 ? 35 : 10,
                );
                return (
                  <div key={item.l} className="flex items-center justify-between text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 font-black ${lvl.bg} ${lvl.text}`}>
                      L{item.l}
                    </span>
                    <span className="text-slate-500 font-medium">{item.label}</span>
                    <span className="text-slate-400">{item.range}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Meetings CTA */}
          <div className="rounded-3xl bg-[#7c4dff] p-7 text-white">
            <Calendar className="h-8 w-8 text-white/60 mb-4" />
            <h4 className="text-xl font-bold mb-3">Meetings &amp; Engagements</h4>
            <p className="text-sm text-white/70 leading-relaxed mb-5">
              View your scheduled parent meetings and confirm attendance.
            </p>
            <Link
              href="/parent/dashboard"
              className="block w-full rounded-2xl bg-white py-3.5 text-center text-xs font-black uppercase tracking-widest text-[#7c4dff] transition hover:bg-slate-50"
            >
              View My Meetings
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
