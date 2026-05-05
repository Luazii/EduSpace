"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { AlertTriangle, ClipboardCheck, BookOpen, TrendingDown } from "lucide-react";
import { api } from "../../../convex/_generated/api";

type TeacherCourseReportProps = {
  courseId: string;
};

type DraftState = {
  notes: string;
  overrideMark: string;
};

function nscBadge(pct: number | null | undefined) {
  if (pct == null) return null;
  if (pct >= 80) return { label: "L7", className: "bg-emerald-100 text-emerald-800" };
  if (pct >= 70) return { label: "L6", className: "bg-sky-100 text-sky-800" };
  if (pct >= 60) return { label: "L5", className: "bg-blue-100 text-blue-800" };
  if (pct >= 50) return { label: "L4", className: "bg-violet-100 text-violet-800" };
  if (pct >= 40) return { label: "L3", className: "bg-amber-100 text-amber-800" };
  if (pct >= 30) return { label: "L2", className: "bg-orange-100 text-orange-800" };
  return { label: "L1", className: "bg-rose-100 text-rose-800" };
}

export function TeacherCourseReport({ courseId }: TeacherCourseReportProps) {
  const typedCourseId = courseId as Id<"courses">;
  const report = useQuery(api.reports.getCourseReport, { courseId: typedCourseId });
  const saveFinalMarkDraft = useMutation(api.reports.saveFinalMarkDraft);
  const publishStudentFinalMark = useMutation(api.reports.publishStudentFinalMark);
  const publishCourseFinalMarks = useMutation(api.reports.publishCourseFinalMarks);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [publishingStudentId, setPublishingStudentId] = useState<string | null>(null);
  const [isPublishingCourse, setIsPublishingCourse] = useState(false);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  async function saveDraft(
    studentUserId: Id<"users">,
    currentOverrideMark?: number,
    currentNotes?: string,
  ) {
    const draft = drafts[studentUserId];
    const overrideText =
      draft?.overrideMark ??
      (typeof currentOverrideMark === "number" ? String(currentOverrideMark) : "");
    const notes = draft?.notes ?? currentNotes;
    setSavingStudentId(studentUserId);
    try {
      await saveFinalMarkDraft({
        courseId: typedCourseId,
        studentUserId,
        overrideMark: overrideText.trim() === "" ? undefined : Number(overrideText),
        notes,
        clearOverride: overrideText.trim() === "",
      });
    } finally {
      setSavingStudentId(null);
    }
  }

  async function publishStudent(
    studentUserId: Id<"users">,
    currentOverrideMark?: number,
    currentNotes?: string,
  ) {
    const draft = drafts[studentUserId];
    const overrideText =
      draft?.overrideMark ??
      (typeof currentOverrideMark === "number" ? String(currentOverrideMark) : "");
    const notes = draft?.notes ?? currentNotes;
    setPublishingStudentId(studentUserId);
    try {
      await publishStudentFinalMark({
        courseId: typedCourseId,
        studentUserId,
        overrideMark: overrideText.trim() === "" ? undefined : Number(overrideText),
        notes,
        clearOverride: overrideText.trim() === "",
      });
    } finally {
      setPublishingStudentId(null);
    }
  }

  async function publishCourse() {
    setIsPublishingCourse(true);
    try {
      await publishCourseFinalMarks({ courseId: typedCourseId });
    } finally {
      setIsPublishingCourse(false);
    }
  }

  if (report === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          Loading course report…
        </div>
      </main>
    );
  }

  const aWeight = report.course.assignmentWeight ?? 50;
  const qWeight = report.course.quizWeight ?? 50;
  const visibleRows = showAtRiskOnly
    ? report.rows.filter((r) => r.isAtRisk)
    : report.rows;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        {/* ── Header ── */}
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Course report
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {report.course.courseName}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{report.course.courseCode}</span>
                <span>{report.course.department}</span>
                <span>{report.summary.studentCount} learners</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold">
                  Assignments {aWeight}% · Quizzes {qWeight}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/teacher/reports"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
              >
                Back to reports
              </Link>
              <Link
                href={`/teacher/gradebook/${courseId}`}
                className="flex items-center gap-2 rounded-full border border-[#7c4dff]/30 bg-[#7c4dff]/5 px-4 py-2 text-sm font-semibold text-[#7c4dff] transition hover:bg-[#7c4dff]/10"
              >
                <BookOpen className="h-4 w-4" />
                Gradebook
              </Link>
              <Link
                href={`/teacher/marking`}
                className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <ClipboardCheck className="h-4 w-4" />
                Marking Portal
              </Link>
              <button
                type="button"
                onClick={() => void publishCourse()}
                disabled={isPublishingCourse || report.summary.readyToPublishCount === 0}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPublishingCourse
                  ? "Publishing…"
                  : `Publish ${report.summary.readyToPublishCount} ready mark${report.summary.readyToPublishCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Average final"
              value={
                typeof report.summary.averageFinalMark === "number"
                  ? `${report.summary.averageFinalMark.toFixed(1)}%`
                  : "No mark"
              }
            />
            <SummaryCard label="Published" value={String(report.summary.publishedFinalMarksCount)} />
            <SummaryCard label="Drafts" value={String(report.summary.draftFinalMarksCount)} />
            <SummaryCard label="Ready" value={String(report.summary.readyToPublishCount)} />
            <SummaryCard
              label="At risk"
              value={String(report.summary.atRiskCount)}
              danger={report.summary.atRiskCount > 0}
            />
          </div>

          {/* At-risk alert banner */}
          {report.summary.atRiskCount > 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
              <TrendingDown className="h-5 w-5 shrink-0 text-rose-600" />
              <p className="text-sm font-bold text-rose-800">
                {report.summary.atRiskCount} student{report.summary.atRiskCount !== 1 ? "s are" : " is"} at risk of not passing this subject (below 50%).
              </p>
              <button
                onClick={() => setShowAtRiskOnly((v) => !v)}
                className="ml-auto shrink-0 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-50 transition"
              >
                {showAtRiskOnly ? "Show all" : "Show at-risk only"}
              </button>
            </div>
          )}
        </section>

        {/* ── Student rows ── */}
        <section className="grid gap-4">
          {visibleRows.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500">
              {showAtRiskOnly ? "No at-risk learners." : "No learner data available yet."}
            </div>
          ) : (
            visibleRows.map((row) => {
              const draft = drafts[row.studentUserId];
              const overrideMark =
                draft?.overrideMark ??
                (typeof row.finalMark?.overrideMark === "number"
                  ? String(row.finalMark.overrideMark)
                  : "");
              const notes = draft?.notes ?? row.finalMark?.notes ?? "";
              const effectiveMark =
                typeof row.finalMark?.overrideMark === "number"
                  ? row.finalMark.overrideMark
                  : row.effectiveFinalMark;

              const isCritical = typeof effectiveMark === "number" && effectiveMark < 40;
              const isAtRisk = row.isAtRisk;
              const badge = nscBadge(effectiveMark);

              return (
                <article
                  key={row.studentUserId}
                  className={`rounded-[1.75rem] border bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition ${
                    isCritical
                      ? "border-rose-300 ring-1 ring-rose-200"
                      : isAtRisk
                      ? "border-amber-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {(isAtRisk || isCritical) && (
                          <AlertTriangle
                            className={`h-4 w-4 ${isCritical ? "text-rose-600" : "text-amber-500"}`}
                          />
                        )}
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                          {row.student?.fullName ?? row.student?.email ?? "Learner"}
                        </h2>
                        {isCritical && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700">
                            Critical
                          </span>
                        )}
                        {isAtRisk && !isCritical && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                            At risk
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span>{row.student?.email ?? "No email"}</span>
                        <span>{row.enrollmentStatus}</span>
                        <span>Status: {row.finalMark?.status ?? "draft"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {badge && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl border px-4 py-4 text-right ${
                          isCritical
                            ? "border-rose-200 bg-rose-50"
                            : isAtRisk
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Effective final mark
                        </p>
                        <p
                          className={`mt-2 text-3xl font-semibold tracking-tight ${
                            isCritical
                              ? "text-rose-700"
                              : isAtRisk
                              ? "text-amber-700"
                              : "text-slate-950"
                          }`}
                        >
                          {typeof effectiveMark === "number"
                            ? `${effectiveMark.toFixed(1)}%`
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {/* Assignment performance */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Assignments ({aWeight}%)
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Assigned: {row.assignmentCount}</p>
                        <p>Submitted: {row.submittedAssignmentsCount}</p>
                        <p>Graded: {row.gradedAssignmentsCount}</p>
                        <p>Awaiting: {row.pendingAssignmentsCount}</p>
                        <p className="font-bold text-slate-800">
                          Average:{" "}
                          {typeof row.averageAssignmentPercent === "number"
                            ? `${row.averageAssignmentPercent.toFixed(1)}%`
                            : "Pending"}
                        </p>
                      </div>
                      {row.pendingAssignmentsCount > 0 && (
                        <Link
                          href={`/teacher/marking`}
                          className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline"
                        >
                          <ClipboardCheck className="h-3 w-3" />
                          Grade now
                        </Link>
                      )}
                    </div>

                    {/* Quiz performance */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Quizzes/Tests ({qWeight}%)
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Quizzes: {row.quizCount}</p>
                        <p>Completed: {row.completedQuizCount}</p>
                        <p>Attempts: {row.quizAttemptsCount}</p>
                        <p className="font-bold text-slate-800">
                          Average:{" "}
                          {typeof row.averageQuizPercent === "number"
                            ? `${row.averageQuizPercent.toFixed(1)}%`
                            : "Pending"}
                        </p>
                        <p>
                          Weighted final:{" "}
                          {typeof row.computedFinalMark === "number"
                            ? `${row.computedFinalMark.toFixed(1)}%`
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Manual assessments
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Captured: {row.manualAssessmentCount}</p>
                        <p className="font-bold text-slate-800">
                          Average:{" "}
                          {typeof row.averageManualPercent === "number"
                            ? `${row.averageManualPercent.toFixed(1)}%`
                            : "Pending"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Used in reports when no assignment or quiz marks are available yet.
                        </p>
                      </div>
                    </div>

                    {/* Final mark controls */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 xl:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Final mark controls
                      </p>
                      <div className="mt-4 grid gap-4">
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Override mark
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={overrideMark}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [row.studentUserId]: {
                                  overrideMark: event.target.value,
                                  notes,
                                },
                              }))
                            }
                            placeholder="Leave blank to use computed mark"
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Notes
                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [row.studentUserId]: {
                                  overrideMark,
                                  notes: event.target.value,
                                },
                              }))
                            }
                            placeholder="Internal notes or moderation comments"
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void saveDraft(
                                row.studentUserId,
                                row.finalMark?.overrideMark,
                                row.finalMark?.notes,
                              )
                            }
                            disabled={savingStudentId === row.studentUserId}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 disabled:opacity-60"
                          >
                            {savingStudentId === row.studentUserId ? "Saving…" : "Save draft"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void publishStudent(
                                row.studentUserId,
                                row.finalMark?.overrideMark,
                                row.finalMark?.notes,
                              )
                            }
                            disabled={
                              publishingStudentId === row.studentUserId ||
                              (overrideMark.trim() === "" &&
                                typeof row.computedFinalMark !== "number")
                            }
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
                          >
                            {publishingStudentId === row.studentUserId
                              ? "Publishing…"
                              : "Publish mark"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  danger?: boolean;
};

function SummaryCard({ label, value, danger }: SummaryCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-4 ${
        danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
          danger ? "text-rose-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-tight ${
          danger ? "text-rose-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </article>
  );
}
