"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

import { api } from "../../../convex/_generated/api";
import { SubmissionComments } from "./submission-comments";

type AssignmentsPanelProps = {
  courseId: string;
};

type GradeDraft = {
  mark: string;
  feedback: string;
};

export function AssignmentsPanel({ courseId }: AssignmentsPanelProps) {
  const typedCourseId = courseId as Id<"courses">;
  const currentUser = useQuery(api.users.current);
  const assignments = useQuery(api.assignments.listByCourse, {
    courseId: typedCourseId,
  }) ?? [];
  const createAssignment = useMutation(api.assignments.create);
  const generateAssignmentUploadUrl = useMutation(api.assignments.generateUploadUrl);
  const generateSubmissionUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const createSubmission = useMutation(api.submissions.create);
  const gradeSubmission = useMutation(api.submissions.grade);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxMark, setMaxMark] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const canCreateAssignments = useMemo(
    () => currentUser?.role === "teacher" || currentUser?.role === "admin",
    [currentUser?.role],
  );
  const canSubmitAssignments = useMemo(
    () => currentUser?.role === "student" || currentUser?.role === "admin",
    [currentUser?.role],
  );

  async function onCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      let documentStorageId: Id<"_storage"> | undefined;
      let documentFileName: string | undefined;

      if (docFile) {
        const uploadUrl = await generateAssignmentUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": docFile.type || "application/octet-stream" },
          body: docFile,
        });
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        documentStorageId = storageId;
        documentFileName = docFile.name;
      }

      await createAssignment({
        courseId: typedCourseId,
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline ? new Date(deadline).getTime() : undefined,
        maxMark: maxMark ? Number(maxMark) : undefined,
        documentStorageId,
        documentFileName,
      });

      setTitle("");
      setDescription("");
      setDeadline("");
      setMaxMark("");
      setDocFile(null);
    } finally {
      setIsCreating(false);
    }
  }

  async function submitAssignment(assignmentId: Id<"assignments">) {
    const file = selectedFiles[assignmentId];

    if (!file) {
      return;
    }

    setSubmittingAssignmentId(assignmentId);

    try {
      const uploadUrl = await generateSubmissionUploadUrl({});
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };

      await createSubmission({
        assignmentId,
        storageId,
        fileName: file.name,
      });

      setSelectedFiles((current) => ({
        ...current,
        [assignmentId]: null,
      }));
    } finally {
      setSubmittingAssignmentId(null);
    }
  }

  async function saveGrade(
    submissionId: Id<"submissions">,
    fallbackMark?: number,
    fallbackFeedback?: string,
  ) {
    const draft = gradeDrafts[submissionId];
    const markText = draft?.mark ?? (typeof fallbackMark === "number" ? String(fallbackMark) : "");
    const feedbackText = draft?.feedback ?? fallbackFeedback ?? "";

    if (markText.trim() === "") {
      return;
    }

    setGradingSubmissionId(submissionId);

    try {
      await gradeSubmission({
        submissionId,
        mark: Number(markText),
        feedback: feedbackText.trim() || undefined,
      });
    } finally {
      setGradingSubmissionId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      {/* Assignments List */}
      <div className="space-y-6">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-300 bg-white/50 p-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No assignments yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs">
              Stay tuned! Coursework will appear here once published by your teacher.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {assignments.map((assignment) => (
              (() => {
                const deadlinePassed = assignment.deadline ? now > assignment.deadline : false;
                const countdown = assignment.deadline
                  ? formatDistanceToNow(assignment.deadline, { addSuffix: true })
                  : null;
                return (
              <article
                key={assignment._id}
                className="group relative rounded-4xl border border-slate-200 bg-white/60 p-8 transition hover:bg-white hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-6">
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {assignment.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                        {assignment.deadline && (
                          <span className="flex items-center gap-1.5 text-rose-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Due {new Date(assignment.deadline).toLocaleString()}
                          </span>
                        )}
                        {countdown && (
                          <>
                            <span>&bull;</span>
                            <span className={deadlinePassed ? "text-rose-600" : "text-sky-600"}>
                              {deadlinePassed ? "Closed" : "Time left"} {countdown}
                            </span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span>{assignment.maxMark} Marks</span>
                        <span>&bull;</span>
                        <span>{assignment.submissionsCount} Submissions</span>
                      </div>
                    </div>
                  </header>

                  {assignment.description && (
                    <p className="text-sm leading-8 text-slate-600">
                      {assignment.description}
                    </p>
                  )}

                  {/* Assignment document download */}
                  {assignment.documentUrl && (
                    <a
                      href={assignment.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:border-slate-950 hover:text-slate-950 w-fit"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      {assignment.documentFileName ?? "Download Assignment"}
                    </a>
                  )}

                  {/* Student Submission Action */}
                  {canSubmitAssignments && !assignment.myLatestSubmission && (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-950">Readdy to submit?</p>
                          <p className="text-xs text-slate-500">Upload your work as a PDF or Doc file.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            id={`file-${assignment._id}`}
                            className="hidden"
                            onChange={(e) =>
                              setSelectedFiles((prev) => ({
                                ...prev,
                                [assignment._id]: e.target.files?.[0] ?? null,
                              }))
                            }
                          />
                          <label
                            htmlFor={`file-${assignment._id}`}
                            className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-950 hover:border-slate-950 transition"
                          >
                            {selectedFiles[assignment._id] ? selectedFiles[assignment._id]?.name : "Select File"}
                          </label>
                          <button
                            onClick={() => void submitAssignment(assignment._id)}
                            disabled={deadlinePassed || submittingAssignmentId === assignment._id || !selectedFiles[assignment._id]}
                            className="rounded-full bg-slate-950 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                          >
                            {deadlinePassed
                              ? "Closed"
                              : submittingAssignmentId === assignment._id
                              ? "Uploading..."
                              : "Submit"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Submission status */}
                  {assignment.myLatestSubmission && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-950">Work Submitted</p>
                            <p className="text-xs text-emerald-700">
                              {assignment.myLatestSubmission.fileName} &bull; {new Date(assignment.myLatestSubmission.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof assignment.myLatestSubmission.mark === "number" ? (
                            <div className="text-right">
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Grade</p>
                              <p className="text-xl font-bold text-emerald-950">{assignment.myLatestSubmission.mark} / {assignment.maxMark}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Awaiting Grade</span>
                          )}
                          {assignment.myLatestSubmission.url && (
                            <a
                              href={assignment.myLatestSubmission.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-950"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Teacher written feedback */}
                      {assignment.myLatestSubmission.feedback && (
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-sky-600">Teacher Feedback</p>
                          <p className="text-sm leading-7 text-slate-700">{assignment.myLatestSubmission.feedback}</p>
                        </div>
                      )}
                      {/* Feedback thread */}
                      <SubmissionComments submissionId={assignment.myLatestSubmission._id as Id<"submissions">} />
                    </div>
                  )}

                  {/* Teacher Review Section */}
                  {canCreateAssignments && assignment.latestStudentSubmissions.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Review Submissions</h4>
                      <div className="grid gap-3">
                        {assignment.latestStudentSubmissions.map((submission) => {
                          const currentMark = gradeDrafts[submission._id]?.mark ?? (typeof submission.mark === "number" ? String(submission.mark) : "");
                          const currentFeedback = gradeDrafts[submission._id]?.feedback ?? submission.feedback ?? "";
                          const isGraded = typeof submission.mark === "number";

                          return (
                            <div key={submission._id} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                              {/* Student info + file */}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    {submission.student?.fullName?.[0] ?? "S"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{submission.student?.fullName}</p>
                                    {isGraded && (
                                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                                        Graded: {submission.mark}{assignment.maxMark ? `/${assignment.maxMark}` : ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {submission.url && (
                                  <a href={submission.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    </svg>
                                    View File
                                  </a>
                                )}
                              </div>
                              {/* Mark + feedback inputs */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder={`Mark${assignment.maxMark ? ` / ${assignment.maxMark}` : ""}`}
                                    min={0}
                                    max={assignment.maxMark ?? undefined}
                                    className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-slate-950"
                                    value={currentMark}
                                    onChange={(e) => setGradeDrafts(prev => ({
                                      ...prev,
                                      [submission._id]: { mark: e.target.value, feedback: currentFeedback }
                                    }))}
                                  />
                                  <button
                                    onClick={() => void saveGrade(submission._id, submission.mark, submission.feedback)}
                                    disabled={gradingSubmissionId === submission._id || !currentMark.trim()}
                                    className="rounded-xl bg-slate-950 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                                  >
                                    {gradingSubmissionId === submission._id ? "Saving..." : isGraded ? "Update" : "Save Grade"}
                                  </button>
                                </div>
                                <textarea
                                  rows={2}
                                  placeholder="Written feedback (optional)"
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-950 resize-none"
                                  value={currentFeedback}
                                  onChange={(e) => setGradeDrafts(prev => ({
                                    ...prev,
                                    [submission._id]: { mark: currentMark, feedback: e.target.value }
                                  }))}
                                />
                              </div>
                              {/* Threaded feedback */}
                              <SubmissionComments submissionId={submission._id as Id<"submissions">} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </article>
                );
              })()
            ))}
          </div>
        )}
      </div>

      {/* Sidebar: Creation Tool */}
      <aside className="sticky top-8 self-start">
        {canCreateAssignments ? (
          <div className="flex-1 space-y-6 overflow-y-auto rounded-4xl border border-slate-200 bg-white/60 p-8 shadow-[0_15px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm">
            <header className="mb-6">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">New Assignment</h3>
              <p className="mt-2 text-sm text-slate-500">Publish coursework for your students.</p>
            </header>
            <form onSubmit={onCreateAssignment} className="grid gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Final Project Proposal"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details and guidelines..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Max Mark</label>
                  <input
                    type="number"
                    value={maxMark}
                    onChange={(e) => setMaxMark(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Assignment Document <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <label
                  htmlFor="assignment-doc-upload"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm transition hover:border-slate-950"
                >
                  <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate text-slate-500">
                    {docFile ? docFile.name : "Attach a PDF, Word or image file…"}
                  </span>
                  {docFile && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setDocFile(null); }}
                      className="ml-auto shrink-0 text-xs text-slate-400 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  )}
                </label>
                <input
                  id="assignment-doc-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="h-14 w-full rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
              >
                {isCreating ? (docFile ? "Uploading…" : "Publishing…") : "Publish Assignment"}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-4xl border border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Only teachers can create assignments. Use this panel to track your course work and grades.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
