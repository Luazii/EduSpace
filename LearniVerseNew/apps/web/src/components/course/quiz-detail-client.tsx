"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Play, RotateCcw, Clock, Shield, Activity } from "lucide-react";

type QuizDetailClientProps = {
  courseId: string;
  quizId: string;
};

export function QuizDetailClient({ courseId, quizId }: QuizDetailClientProps) {
  const typedQuizId = quizId as Id<"quizzes">;
  const router = useRouter();

  const quiz = useQuery(api.quizzes.getDetail, { quizId: typedQuizId });
  const activeSession = useQuery(api.quizSessions.getActiveSessionForQuiz, {
    quizId: typedQuizId,
  });
  const addQuestion = useMutation(api.quizzes.addQuestion);
  const startSession = useMutation(api.quizSessions.startSession);

  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [weighting, setWeighting] = useState("1");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const canTakeQuiz = useMemo(() => {
    if (!quiz) return false;
    return (
      quiz.availability.available &&
      quiz.attemptsRemaining > 0 &&
      quiz.questions.length > 0
    );
  }, [quiz]);

  async function handleStartSession() {
    if (!hasActiveSession && !canTakeQuiz) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const { sessionId } = await startSession({ quizId: typedQuizId });
      router.push(`/courses/${courseId}/quizzes/${quizId}/session`);
      void sessionId; // used server-side; client navigates to session
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start quiz.");
      setIsStarting(false);
    }
  }

  async function onAddQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt.trim() || cleanedOptions.length < 2 || !correctAnswer.trim()) return;
    setIsSavingQuestion(true);
    try {
      await addQuestion({
        quizId: typedQuizId,
        prompt: prompt.trim(),
        options: cleanedOptions,
        correctAnswer: correctAnswer.trim(),
        weighting: Math.max(Number(weighting || "1"), 1),
      });
      setPrompt("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
      setWeighting("1");
    } finally {
      setIsSavingQuestion(false);
    }
  }

  if (quiz === undefined || activeSession === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500">
          Loading quiz…
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Quiz not found</h1>
          <Link
            href={`/courses/${courseId}`}
            className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to classroom
          </Link>
        </div>
      </main>
    );
  }

  const hasActiveSession = !!activeSession;
  const timeRemaining = activeSession?.endsAt
    ? Math.max(0, activeSession.endsAt - Date.now())
    : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        {/* ── Header card ── */}
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Quiz</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {quiz.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                {quiz.course?.courseName && <span>{quiz.course.courseName}</span>}
                <span>{quiz.maxAttempts} max attempt{quiz.maxAttempts !== 1 ? "s" : ""}</span>
                <span>{quiz.attemptsUsed} used</span>
                {quiz.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {quiz.durationMinutes} min
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/courses/${courseId}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Back to classroom
            </Link>
          </div>
          {quiz.description && (
            <p className="mt-5 max-w-4xl text-sm leading-8 text-slate-600">{quiz.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
            {quiz.startsAt && <span>Opens {new Date(quiz.startsAt).toLocaleString()}</span>}
            {quiz.endsAt && <span>Closes {new Date(quiz.endsAt).toLocaleString()}</span>}
            <span>{quiz.availability.available ? "Available" : quiz.availability.reason}</span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ── Start / Resume panel ── */}
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              {hasActiveSession ? "Session in Progress" : "Take Quiz"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {hasActiveSession ? "Resume where you left off" : "Start your attempt"}
            </h2>

            {hasActiveSession && timeRemaining !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">
                  {Math.floor(timeRemaining / 60000)}m {Math.round((timeRemaining % 60000) / 1000)}s remaining
                </p>
              </div>
            )}

            {hasActiveSession && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {activeSession.answers.length} of {quiz.questions.length} questions answered
              </div>
            )}

            {quiz.bestAttempt && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Best score: {quiz.bestAttempt.score} / {quiz.bestAttempt.maxScore} (
                {quiz.bestAttempt.maxScore
                  ? Math.round((quiz.bestAttempt.score / quiz.bestAttempt.maxScore) * 100)
                  : 0}
                %)
              </div>
            )}

            {startError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {startError}
              </div>
            )}

            {!quiz.canManage && (
              <button
                onClick={() => void handleStartSession()}
                disabled={(!canTakeQuiz && !hasActiveSession) || isStarting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isStarting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : hasActiveSession ? (
                  <>
                    <RotateCcw className="h-4 w-4" /> Resume Session
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Start Quiz
                  </>
                )}
              </button>
            )}

            {!canTakeQuiz && !hasActiveSession && !quiz.canManage && (
              <p className="mt-4 text-center text-xs text-slate-400">
                {!quiz.availability.available
                  ? quiz.availability.reason
                  : quiz.attemptsRemaining === 0
                  ? "No attempts remaining."
                  : "No questions available yet."}
              </p>
            )}

            {/* Attempt history */}
            {quiz.canManage && quiz.attempts.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  All attempts
                </p>
                {quiz.attempts.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt._id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-600">
                      {new Date(attempt.submittedAt).toLocaleString()}
                    </span>
                    <span className="font-semibold text-slate-950">
                      {attempt.score} / {attempt.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6">
            {/* ── Attempt summary ── */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Progress</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Attempt summary
              </h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  Attempts used: {quiz.attemptsUsed}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  Attempts remaining: {quiz.attemptsRemaining}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  Best score:{" "}
                  {quiz.bestAttempt
                    ? `${quiz.bestAttempt.score} / ${quiz.bestAttempt.maxScore}`
                    : "No attempts yet"}
                </div>
              </div>

              {/* Link to live proctoring for teachers */}
              {quiz.canManage && (
                <Link
                  href={`/teacher/proctor/${quiz.courseId}`}
                  className="mt-4 flex items-center gap-2 rounded-2xl border border-[#7c4dff]/20 bg-[#7c4dff]/5 px-4 py-3 text-sm font-bold text-[#7c4dff] hover:bg-[#7c4dff]/10 transition"
                >
                  <Activity className="h-4 w-4" /> Open Live Proctor View
                </Link>
              )}
            </div>

            {/* ── Question authoring ── */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Question authoring
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Add questions
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {quiz.canManage
                  ? "Correct answers are never sent to students in their session payload."
                  : "Question authoring is available to teachers and admins."}
              </p>

              {quiz.canManage ? (
                <form onSubmit={onAddQuestion} className="mt-6 grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Prompt
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder="What does HTTP stand for?"
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                    />
                  </label>
                  {options.map((option, index) => (
                    <label key={index} className="grid gap-2 text-sm font-medium text-slate-700">
                      Option {index + 1}
                      <input
                        value={option}
                        onChange={(e) =>
                          setOptions((cur) =>
                            cur.map((item, i) => (i === index ? e.target.value : item)),
                          )
                        }
                        placeholder={`Choice ${index + 1}`}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </label>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Correct answer
                      <input
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="Exact text of the correct option"
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Weighting
                      <input
                        type="number"
                        min="1"
                        value={weighting}
                        onChange={(e) => setWeighting(e.target.value)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingQuestion || !prompt.trim()}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSavingQuestion ? "Saving…" : "Add question"}
                  </button>
                </form>
              ) : (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <Shield className="h-4 w-4 shrink-0" />
                  Sign in with a teacher or admin account to manage questions.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
