"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, Trash2, CheckCircle2, Plus } from "lucide-react";

type Props = {
  courseId: string;
  quizId: string;
};

const LETTERS = ["A", "B", "C", "D"] as const;

function emptyOptions(): [string, string, string, string] {
  return ["", "", "", ""];
}

export function QuizBuilder({ courseId, quizId }: Props) {
  const typedQuizId = quizId as Id<"quizzes">;

  const quiz = useQuery(api.quizzes.getDetail, { quizId: typedQuizId });
  const addQuestion = useMutation(api.quizzes.addQuestion);
  const deleteQuestion = useMutation(api.quizzes.deleteQuestion);

  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<[string, string, string, string]>(emptyOptions());
  const [correctIdx, setCorrectIdx] = useState<0 | 1 | 2 | 3 | null>(null);
  const [weighting, setWeighting] = useState("2");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  if (quiz === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-slate-500">Quiz not found.</p>
      </main>
    );
  }

  const questions = quiz.questions.sort((a, b) => a.position - b.position);
  const totalMarks = questions.reduce((s, q) => s + q.weighting, 0);

  async function handleAdd() {
    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt.trim() || filledOptions.length < 2 || correctIdx === null) return;
    const correctAnswer = options[correctIdx].trim();
    if (!correctAnswer) return;

    setSaving(true);
    try {
      await addQuestion({
        quizId: typedQuizId,
        prompt: prompt.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        correctAnswer,
        weighting: Math.max(Number(weighting || "2"), 1),
      });
      setPrompt("");
      setOptions(emptyOptions());
      setCorrectIdx(null);
      setWeighting("2");
      setSavedCount((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(questionId: Id<"questions">) {
    setDeletingId(questionId);
    try {
      await deleteQuestion({ questionId });
    } finally {
      setDeletingId(null);
    }
  }

  const canAdd =
    prompt.trim().length > 0 &&
    correctIdx !== null &&
    options[correctIdx].trim().length > 0 &&
    options.filter((o) => o.trim()).length >= 2;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-14 sm:px-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/courses/${courseId}/quizzes/${quizId}`}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quiz
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Build: {quiz.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {quiz.course?.courseName} &bull; {quiz.status === "published" ? "Published" : "Draft"}
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions</p>
            <p className="text-2xl font-black text-slate-950">{questions.length}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total marks</p>
            <p className="text-2xl font-black text-[#7c4dff]">{totalMarks}</p>
          </div>
          {savedCount > 0 && (
            <>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold">{savedCount} added this session</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* ── Question list ── */}
        <div className="space-y-4">
          {questions.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Plus className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-600">No questions yet</p>
              <p className="mt-1 text-xs text-slate-400">Add your first question using the form.</p>
            </div>
          )}

          {questions.map((q, idx) => (
            <article
              key={q._id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7c4dff] text-[10px] font-black text-white">
                    {idx + 1}
                  </span>
                  <p className="font-bold text-slate-900 leading-snug">{q.prompt}</p>
                </div>
                <button
                  onClick={() => void handleDelete(q._id as Id<"questions">)}
                  disabled={deletingId === q._id}
                  className="shrink-0 rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40"
                >
                  {deletingId === q._id ? (
                    <span className="h-4 w-4 block animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-4 grid gap-2 pl-10">
                {q.options.map((opt, oi) => {
                  const letter = LETTERS[oi] ?? String(oi + 1);
                  const isCorrect = opt === q.correctAnswer;
                  return (
                    <div
                      key={oi}
                      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm ${
                        isCorrect
                          ? "border border-emerald-200 bg-emerald-50 font-bold text-emerald-800"
                          : "border border-slate-100 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                          isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {letter}
                      </span>
                      {opt}
                      {isCorrect && (
                        <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pl-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{q.weighting} mark{q.weighting !== 1 ? "s" : ""}</span>
              </div>
            </article>
          ))}
        </div>

        {/* ── Add question form ── */}
        <aside className="sticky top-8 self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#7c4dff]">
              Question {questions.length + 1}
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Add question</h2>

            <div className="mt-5 space-y-4">
              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Question text
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What does HTTP stand for?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-950 resize-none"
                />
              </div>

              {/* Options A–D with inline correct-answer radio */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Options &amp; correct answer
                </label>
                <p className="text-[10px] text-slate-400">Fill options then click the letter to mark the correct one.</p>
                <div className="space-y-2">
                  {LETTERS.map((letter, i) => {
                    const isCorrect = correctIdx === i;
                    return (
                      <div key={letter} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectIdx(isCorrect ? null : (i as 0 | 1 | 2 | 3))}
                          title={`Mark option ${letter} as correct`}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition ${
                            isCorrect
                              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          value={options[i]}
                          onChange={(e) =>
                            setOptions((prev) => {
                              const next = [...prev] as [string, string, string, string];
                              next[i] = e.target.value;
                              return next;
                            })
                          }
                          placeholder={`Option ${letter}`}
                          className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm outline-none transition focus:border-slate-950 ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                {correctIdx !== null && options[correctIdx].trim() === "" && (
                  <p className="text-[10px] text-rose-500">
                    Fill in option {LETTERS[correctIdx]} — it&apos;s marked as correct but is empty.
                  </p>
                )}
              </div>

              {/* Weighting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Marks (weighting)
                </label>
                <input
                  type="number"
                  min="1"
                  value={weighting}
                  onChange={(e) => setWeighting(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-950"
                />
              </div>

              <button
                onClick={() => void handleAdd()}
                disabled={saving || !canAdd}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add question
                  </>
                )}
              </button>
            </div>
          </div>

          <Link
            href={`/courses/${courseId}/quizzes/${quizId}`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Done — view quiz
          </Link>
        </aside>
      </div>
    </main>
  );
}
