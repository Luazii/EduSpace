"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type TeacherCourseReportProps = {
  courseId: string;
};

type DraftState = {
  notes: string;
  overrideMark: string;
};

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
      await publishCourseFinalMarks({
        courseId: typedCourseId,
      });
    } finally {
      setIsPublishingCourse(false);
    }
  }

  if (report === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          Loading course report...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
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
                href={`/courses/${report.course._id}`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
              >
                Open classroom
              </Link>
              <button
                type="button"
                onClick={() => void publishCourse()}
                disabled={isPublishingCourse || report.summary.readyToPublishCount === 0}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPublishingCourse ? "Publishing..." : "Publish all ready marks"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Average final"
              value={
                typeof report.summary.averageFinalMark === "number"
                  ? `${report.summary.averageFinalMark.toFixed(1)}%`
                  : "No mark"
              }
            />
            <SummaryCard
              label="Published"
              value={String(report.summary.publishedFinalMarksCount)}
            />
            <SummaryCard
              label="Drafts"
              value={String(report.summary.draftFinalMarksCount)}
            />
            <SummaryCard
              label="Ready to publish"
              value={String(report.summary.readyToPublishCount)}
            />
            <SummaryCard label="At risk" value={String(report.summary.atRiskCount)} />
          </div>
        </section>

        <section className="grid gap-4">
          {report.rows.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500">
              No learner data is available for this course yet.
            </div>
          ) : (
            report.rows.map((row) => {
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

              return (
                <article
                  key={row.studentUserId}
                  className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        {row.student?.fullName ?? row.student?.email ?? "Learner"}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span>{row.student?.email ?? "No email"}</span>
                        <span>{row.enrollmentStatus}</span>
                        <span>
                          Status: {row.finalMark?.status ?? "draft"}
                        </span>
                        {row.isAtRisk ? (
                          <span className="font-semibold text-amber-700">At risk</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Effective final mark
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        {typeof effectiveMark === "number"
                          ? `${effectiveMark.toFixed(1)}%`
                          : "Pending"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Assignment performance
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Assigned: {row.assignmentCount}</p>
                        <p>Submitted: {row.submittedAssignmentsCount}</p>
                        <p>Graded: {row.gradedAssignmentsCount}</p>
                        <p>Awaiting review: {row.pendingAssignmentsCount}</p>
                        <p>
                          Average:{" "}
                          {typeof row.averageAssignmentPercent === "number"
                            ? `${row.averageAssignmentPercent.toFixed(1)}%`
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Quiz performance
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Quizzes: {row.quizCount}</p>
                        <p>Completed: {row.completedQuizCount}</p>
                        <p>Attempts: {row.quizAttemptsCount}</p>
                        <p>
                          Average:{" "}
                          {typeof row.averageQuizPercent === "number"
                            ? `${row.averageQuizPercent.toFixed(1)}%`
                            : "Pending"}
                        </p>
                        <p>
                          Computed final:{" "}
                          {typeof row.computedFinalMark === "number"
                            ? `${row.computedFinalMark.toFixed(1)}%`
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
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
                            rows={3}
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
                            placeholder="Add comments for moderation or internal review"
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
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingStudentId === row.studentUserId
                              ? "Saving..."
                              : "Save draft"}
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
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {publishingStudentId === row.studentUserId
                              ? "Publishing..."
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
};

function SummaryCard({ label, value }: SummaryCardProps) {
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
