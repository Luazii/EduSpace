"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type QuizzesPanelProps = {
  courseId: string;
};

export function QuizzesPanel({ courseId }: QuizzesPanelProps) {
  const typedCourseId = courseId as Id<"courses">;
  const currentUser = useQuery(api.users.current);
  const quizzes = useQuery(api.quizzes.listByCourse, { courseId: typedCourseId }) ?? [];
  const createQuiz = useMutation(api.quizzes.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [isCreating, setIsCreating] = useState(false);

  const canManage = useMemo(
    () => currentUser?.role === "teacher" || currentUser?.role === "admin",
    [currentUser?.role],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      await createQuiz({
        courseId: typedCourseId,
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: startsAt ? new Date(startsAt).getTime() : undefined,
        endsAt: endsAt ? new Date(endsAt).getTime() : undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        maxAttempts: Math.max(Number(maxAttempts || "1"), 1),
        status,
      });

      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setDurationMinutes("");
      setMaxAttempts("1");
      setStatus("published");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      {/* Quizzes List */}
      <div className="space-y-6">
        {quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-slate-300 bg-white/50 p-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No quizzes yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs">
              Assessments will appear here when your teacher publishes them.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <article
                key={quiz._id}
                className="group relative rounded-2xl border border-slate-200 bg-white/60 p-6 transition hover:bg-white hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950">{quiz.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>{quiz.questionCount} Questions</span>
                        <span>&bull;</span>
                        <span>{quiz.maxAttempts} Max Attempts</span>
                        <span>&bull;</span>
                        <span className={quiz.attemptsUsed >= quiz.maxAttempts ? "text-rose-600" : "text-emerald-600"}>
                          {quiz.attemptsUsed} Used
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/courses/${courseId}/quizzes/${quiz._id}`}
                    className="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                  >
                    {quiz.availability.available ? "Start Quiz" : "View Results"}
                  </Link>
                </div>
                
                {quiz.description && (
                  <p className="mt-4 text-sm leading-7 text-slate-600 pl-16">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 pl-16 text-[10px] font-bold uppercase tracking-widest">
                  {quiz.startsAt && (
                    <span className="text-slate-400">Opens: {new Date(quiz.startsAt).toLocaleString()}</span>
                  )}
                  {quiz.endsAt && (
                    <span className="text-slate-400">Closes: {new Date(quiz.endsAt).toLocaleString()}</span>
                  )}
                  {!quiz.availability.available && (
                    <span className="text-rose-600">{quiz.availability.reason}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar: Creation Tool */}
      <aside className="sticky top-8 self-start">
        {canManage ? (
          <div className="flex-1 space-y-6 overflow-y-auto rounded-4xl border border-slate-200 bg-white/60 p-8 shadow-[0_15px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm">
            <header className="mb-6">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">New Quiz</h3>
              <p className="mt-2 text-sm text-slate-500">Create a new assessment for this course.</p>
            </header>
            <form onSubmit={onSubmit} className="grid gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Midterm Examination"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for students..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Opens At</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Closes At</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Duration (m)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Attempts</label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="h-14 w-full rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
              >
                {isCreating ? "Creating..." : "Create Quiz"}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Quiz management is reserved for teaching staff.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
