"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type Props = {
  courseId: string;
  assignmentId: string;
};

function GradeLevel(pct: number) {
  if (pct >= 80) return { level: 7, color: "emerald", label: "L7" };
  if (pct >= 70) return { level: 6, color: "sky", label: "L6" };
  if (pct >= 60) return { level: 5, color: "blue", label: "L5" };
  if (pct >= 50) return { level: 4, color: "violet", label: "L4" };
  if (pct >= 40) return { level: 3, color: "amber", label: "L3" };
  if (pct >= 30) return { level: 2, color: "orange", label: "L2" };
  return { level: 1, color: "rose", label: "L1" };
}

type RowDraft = { mark: string; feedback: string };

export function AssignmentMarker({ courseId, assignmentId }: Props) {
  const typedAssignmentId = assignmentId as Id<"assignments">;

  const data = useQuery(api.submissions.listForAssignment, {
    assignmentId: typedAssignmentId,
  });
  const gradeSubmission = useMutation(api.submissions.grade);
  const releaseGrade = useMutation(api.submissions.releaseGrade);

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function setDraft(studentId: string, field: keyof RowDraft, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        mark: prev[studentId]?.mark ?? "",
        feedback: prev[studentId]?.feedback ?? "",
        [field]: value,
      },
    }));
  }

  async function handleSave(
    submissionId: Id<"submissions">,
    studentId: string,
    maxMark?: number | null,
  ) {
    const draft = drafts[studentId];
    const markText = draft?.mark?.trim() ?? "";
    if (!markText) return;
    const mark = Number(markText);
    if (isNaN(mark) || mark < 0 || (maxMark !== null && maxMark !== undefined && mark > maxMark)) return;

    setSaving(studentId);
    try {
      await gradeSubmission({
        submissionId,
        mark,
        feedback: draft?.feedback?.trim() || undefined,
      });
      setSavedIds((prev) => new Set([...prev, studentId]));
    } finally {
      setSaving(null);
    }
  }

  async function handleRelease(submissionId: Id<"submissions">, studentId: string) {
    setReleasing(studentId);
    try {
      await releaseGrade({ submissionId });
    } finally {
      setReleasing(null);
    }
  }

  if (data === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
      </div>
    );
  }

  const { assignment, rows, gradedCount, totalCount } = data;
  const progress = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Back */}
      <Link
        href={`/teacher/marking`}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Marking Portal
      </Link>

      {/* Header */}
      <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#7c4dff]">
              {assignment.course?.courseCode} · {assignment.course?.courseName}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {assignment.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              {assignment.maxMark && <span>Max mark: {assignment.maxMark}</span>}
              {assignment.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Due {new Date(assignment.deadline).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Progress
            </p>
            <p className="text-2xl font-black text-slate-950">
              {gradedCount}/{totalCount}
            </p>
            <p className="text-xs text-slate-400">graded</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>{progress}% complete</span>
            {progress === 100 && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> All graded
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                progress === 100 ? "bg-emerald-500" : "bg-[#7c4dff]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Student rows */}
      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
            No students enrolled in this subject yet.
          </div>
        )}

        {rows.map((row) => {
          const sid = String(row.studentUserId);
          const sub = row.submission;
          const draft = drafts[sid];
          const currentMark =
            draft?.mark ?? (typeof sub?.mark === "number" ? String(sub.mark) : "");
          const currentFeedback = draft?.feedback ?? sub?.feedback ?? "";
          const markNum = Number(currentMark);
          const pctNum =
            !isNaN(markNum) && assignment.maxMark
              ? Math.round((markNum / assignment.maxMark) * 100)
              : null;
          const gl = pctNum !== null ? GradeLevel(pctNum) : null;
          const justSaved = savedIds.has(sid) && saving !== sid;

          return (
            <article
              key={sid}
              className={`rounded-3xl border bg-white p-6 shadow-sm transition ${
                row.isGraded
                  ? "border-emerald-100"
                  : sub
                  ? "border-amber-200 shadow-amber-50"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Student info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                    {row.studentName?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {row.studentName ?? row.studentEmail}
                    </p>
                    <p className="text-xs text-slate-400">{row.studentEmail}</p>
                  </div>
                </div>

                {/* Status / file */}
                <div className="flex items-center gap-2">
                  {!sub && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Not submitted
                    </span>
                  )}
                  {sub && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <FileText className="h-3 w-3" />
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                  {sub?.url && (
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View file
                    </a>
                  )}
                  {row.isGraded && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Graded
                    </span>
                  )}
                </div>
              </div>

              {sub && (
                <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr_auto]">
                  {/* Mark input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={assignment.maxMark ?? undefined}
                      placeholder={`0${assignment.maxMark ? `–${assignment.maxMark}` : ""}`}
                      value={currentMark}
                      onChange={(e) => setDraft(sid, "mark", e.target.value)}
                      className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-slate-950 transition"
                    />
                    {assignment.maxMark && (
                      <span className="text-sm text-slate-400">
                        / {assignment.maxMark}
                      </span>
                    )}
                    {/* Grade level badge */}
                    {gl && currentMark && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black text-white bg-${gl.color}-500`}
                        style={{
                          backgroundColor:
                            gl.color === "emerald"
                              ? "#10b981"
                              : gl.color === "sky"
                              ? "#0ea5e9"
                              : gl.color === "blue"
                              ? "#3b82f6"
                              : gl.color === "violet"
                              ? "#8b5cf6"
                              : gl.color === "amber"
                              ? "#f59e0b"
                              : gl.color === "orange"
                              ? "#f97316"
                              : "#f43f5e",
                        }}
                      >
                        {gl.label} · {pctNum}%
                      </span>
                    )}
                  </div>

                  {/* Feedback */}
                  <textarea
                    rows={2}
                    placeholder="Written feedback (optional)"
                    value={currentFeedback}
                    onChange={(e) => setDraft(sid, "feedback", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-950 resize-none transition"
                  />

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        void handleSave(
                          sub._id as Id<"submissions">,
                          sid,
                          assignment.maxMark,
                        )
                      }
                      disabled={saving === sid || !currentMark.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      {saving === sid ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : justSaved ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          {row.isGraded ? "Update" : "Save"}
                        </>
                      )}
                    </button>

                    {/* Release / hold grade toggle */}
                    {row.isGraded && (
                      <button
                        onClick={() =>
                          void handleRelease(sub._id as Id<"submissions">, sid)
                        }
                        disabled={releasing === sid || sub.isReleased === true}
                        className={`flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                          sub.isReleased === true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sub.isReleased === true ? (
                          <>
                            <Eye className="h-3 w-3" /> Released
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Release
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Existing feedback display */}
              {sub?.feedback && !draft?.feedback && (
                <div className="mt-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-1">
                    Current feedback
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{sub.feedback}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
