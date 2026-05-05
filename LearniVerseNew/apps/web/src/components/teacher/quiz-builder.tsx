"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Plus,
  Sparkles,
  FileUp,
  BookOpen,
  Globe,
  EyeOff,
} from "lucide-react";

type Props = { courseId: string; quizId: string };

const LETTERS = ["A", "B", "C", "D"] as const;

type GeneratedQ = {
  prompt: string;
  options: string[];
  correctAnswer: string;
  weighting: number;
};

function emptyOptions(): [string, string, string, string] {
  return ["", "", "", ""];
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
      <Globe className="h-3 w-3" /> Published
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
      <EyeOff className="h-3 w-3" /> Draft — progress saved
    </span>
  );
}

export function QuizBuilder({ courseId, quizId }: Props) {
  const typedQuizId = quizId as Id<"quizzes">;

  const quiz = useQuery(api.quizzes.getDetail, { quizId: typedQuizId });
  const addQuestion = useMutation(api.quizzes.addQuestion);
  const addQuestionsFromAI = useMutation(api.quizzes.addQuestionsFromAI);
  const deleteQuestion = useMutation(api.quizzes.deleteQuestion);
  const updateStatus = useMutation(api.quizzes.updateStatus);

  // Manual add form
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<[string, string, string, string]>(emptyOptions());
  const [correctIdx, setCorrectIdx] = useState<0 | 1 | 2 | 3 | null>(null);
  const [weighting, setWeighting] = useState("2");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Status toggle
  const [togglingStatus, setTogglingStatus] = useState(false);

  // AI generation
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiCount, setAiCount] = useState("5");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previewQs, setPreviewQs] = useState<GeneratedQ[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [savingAI, setSavingAI] = useState(false);

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

  const questions = [...quiz.questions].sort((a, b) => a.position - b.position);
  const totalMarks = questions.reduce((s, q) => s + q.weighting, 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAdd() {
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt.trim() || filled.length < 2 || correctIdx === null) return;
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

  async function handleToggleStatus() {
    const next = quiz!.status === "published" ? "draft" : "published";
    setTogglingStatus(true);
    try {
      await updateStatus({ quizId: typedQuizId, status: next });
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleGenerate() {
    if (!aiFile) return;
    setGenerating(true);
    setAiError(null);
    setPreviewQs([]);
    setSelectedIdxs(new Set());
    try {
      let body: object;
      if (aiFile.type === "application/pdf") {
        const buffer = await aiFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        body = { fileBase64: base64, mediaType: "application/pdf", questionCount: Number(aiCount) };
      } else {
        const text = await aiFile.text();
        body = { text, questionCount: Number(aiCount) };
      }

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { questions?: GeneratedQ[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      setPreviewQs(data.questions ?? []);
      setSelectedIdxs(new Set((data.questions ?? []).map((_, i) => i)));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAI() {
    const toSave = previewQs.filter((_, i) => selectedIdxs.has(i));
    if (!toSave.length) return;
    setSavingAI(true);
    try {
      await addQuestionsFromAI({ quizId: typedQuizId, questions: toSave });
      setPreviewQs([]);
      setSelectedIdxs(new Set());
      setAiFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setSavedCount((n) => n + toSave.length);
    } finally {
      setSavingAI(false);
    }
  }

  const canAdd =
    prompt.trim().length > 0 &&
    correctIdx !== null &&
    options[correctIdx].trim().length > 0 &&
    options.filter((o) => o.trim()).length >= 2;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-14 sm:px-10">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/courses/${courseId}/quizzes/${quizId}`}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quiz
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{quiz.title}</h1>
            <StatusBadge status={quiz.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{quiz.course?.courseName}</p>
        </div>

        {/* Stats + status toggle */}
        <div className="flex flex-wrap items-center gap-3">
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
                  <span className="text-xs font-bold">{savedCount} added</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => void handleToggleStatus()}
            disabled={togglingStatus}
            className={`rounded-2xl border px-5 py-2.5 text-xs font-black uppercase tracking-widest transition ${
              quiz.status === "published"
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {togglingStatus
              ? "Saving…"
              : quiz.status === "published"
              ? "Revert to draft"
              : "Publish quiz"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* ── Left: question list + AI preview ── */}
        <div className="space-y-6">
          {/* Draft progress banner */}
          {quiz.status === "draft" && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
              <EyeOff className="h-4 w-4 shrink-0" />
              <span>
                <strong>Draft saved.</strong> Students cannot see this quiz until you publish it.
                Your questions are auto-saved as you add them.
              </span>
            </div>
          )}

          {/* Question list */}
          {questions.length === 0 && previewQs.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Plus className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-600">No questions yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Add questions manually or generate them with AI.
              </p>
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
                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
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
                          isCorrect ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {letter}
                      </span>
                      {opt}
                      {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 pl-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {q.weighting} mark{q.weighting !== 1 ? "s" : ""}
              </p>
            </article>
          ))}

          {/* ── AI generated questions preview ── */}
          {previewQs.length > 0 && (
            <section className="rounded-3xl border border-[#7c4dff]/20 bg-[#7c4dff]/5 p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#7c4dff]">
                    <Sparkles className="h-3.5 w-3.5" /> AI Generated — review before saving
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {selectedIdxs.size} of {previewQs.length} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedIdxs(
                        selectedIdxs.size === previewQs.length
                          ? new Set()
                          : new Set(previewQs.map((_, i) => i)),
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    {selectedIdxs.size === previewQs.length ? "Deselect all" : "Select all"}
                  </button>
                  <button
                    onClick={() => void handleSaveAI()}
                    disabled={savingAI || selectedIdxs.size === 0}
                    className="flex items-center gap-2 rounded-xl bg-[#7c4dff] px-5 py-2 text-xs font-black text-white transition hover:bg-[#6c3dff] disabled:bg-slate-300"
                  >
                    {savingAI ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add {selectedIdxs.size} to quiz
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {previewQs.map((q, i) => {
                  const selected = selectedIdxs.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() =>
                        setSelectedIdxs((prev) => {
                          const next = new Set(prev);
                          selected ? next.delete(i) : next.add(i);
                          return next;
                        })
                      }
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        selected
                          ? "border-[#7c4dff]/30 bg-white shadow-sm"
                          : "border-slate-200 bg-white/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black transition ${
                            selected
                              ? "border-[#7c4dff] bg-[#7c4dff] text-white"
                              : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {selected ? "✓" : i + 1}
                        </span>
                        <p className="text-sm font-bold text-slate-900">{q.prompt}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-1.5 pl-9">
                        {q.options.map((opt, oi) => {
                          const letter = LETTERS[oi] ?? String(oi + 1);
                          const isCorrect = opt === q.correctAnswer;
                          return (
                            <div
                              key={oi}
                              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                isCorrect
                                  ? "bg-emerald-50 font-bold text-emerald-800"
                                  : "bg-slate-50 text-slate-500"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                  isCorrect ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 pl-9 text-[10px] font-bold text-slate-400">
                        {q.weighting} marks
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <aside className="space-y-5 sticky top-8 self-start">
          {/* Manual add form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Manual — Question {questions.length + 1}
              </p>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Add question</h2>

            <div className="mt-5 space-y-4">
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Options &amp; correct answer
                </label>
                <p className="text-[10px] text-slate-400">Click a letter to mark it correct.</p>
                <div className="space-y-2">
                  {LETTERS.map((letter, i) => {
                    const isCorrect = correctIdx === i;
                    return (
                      <div key={letter} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectIdx(isCorrect ? null : (i as 0 | 1 | 2 | 3))}
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
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Marks
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

          {/* AI generation panel */}
          <div className="rounded-3xl border border-[#7c4dff]/20 bg-gradient-to-b from-[#7c4dff]/5 to-white p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-[#7c4dff]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#7c4dff]">
                AI — Generate from document
              </p>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Auto-create questions</h2>
            <p className="mt-1 text-xs text-slate-500 leading-5">
              Upload a PDF or text file and Claude will generate multiple-choice questions for you to review.
            </p>

            <div className="mt-5 space-y-4">
              {/* File picker */}
              <div>
                <label
                  htmlFor="ai-doc-upload"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#7c4dff]/30 bg-white px-4 py-3 text-sm transition hover:border-[#7c4dff]/60"
                >
                  <FileUp className="h-5 w-5 shrink-0 text-[#7c4dff]" />
                  <span className="truncate text-slate-500">
                    {aiFile ? aiFile.name : "Choose PDF or .txt file…"}
                  </span>
                  {aiFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setAiFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="ml-auto shrink-0 text-xs text-slate-400 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  )}
                </label>
                <input
                  ref={fileRef}
                  id="ai-doc-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => {
                    setAiFile(e.target.files?.[0] ?? null);
                    setPreviewQs([]);
                    setAiError(null);
                  }}
                />
              </div>

              {/* Question count */}
              <div className="flex items-center gap-3">
                <label className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Questions to generate
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={aiCount}
                  onChange={(e) => setAiCount(e.target.value)}
                  className="w-20 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 text-center"
                />
              </div>

              {aiError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                  {aiError}
                </p>
              )}

              <button
                onClick={() => void handleGenerate()}
                disabled={!aiFile || generating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c4dff] py-3.5 text-sm font-black text-white transition hover:bg-[#6c3dff] disabled:bg-slate-300"
              >
                {generating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate questions
                  </>
                )}
              </button>
            </div>
          </div>

          <Link
            href={`/courses/${courseId}/quizzes/${quizId}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Done — view quiz
          </Link>
        </aside>
      </div>
    </main>
  );
}
