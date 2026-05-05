"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, Send } from "lucide-react";

type QuizSessionClientProps = {
  courseId: string;
  quizId: string;
};

function formatTime(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function QuizSessionClient({ courseId, quizId }: QuizSessionClientProps) {
  const typedQuizId = quizId as Id<"quizzes">;
  const router = useRouter();

  const sessionData = useQuery(api.quizSessions.getActiveSessionForQuiz, {
    quizId: typedQuizId,
  });

  const saveAnswer = useMutation(api.quizSessions.saveAnswer);
  const submitSession = useMutation(api.quizSessions.submitSession);

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate local answers from server state on first load
  useEffect(() => {
    if (!sessionData) return;
    const serverAnswers: Record<string, string> = {};
    for (const a of sessionData.answers) {
      serverAnswers[String(a.questionId)] = a.answer;
    }
    setLocalAnswers((prev) => ({ ...serverAnswers, ...prev }));
    setCurrentIndex(sessionData.currentQuestionIndex);
  }, [sessionData?._id]); // only run once when session id is known

  // Countdown timer
  useEffect(() => {
    if (!sessionData?.endsAt) return;

    const tick = () => setTimeRemainingMs(Math.max(0, sessionData.endsAt! - Date.now()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionData?.endsAt]);

  // Auto-submit when time hits 0 (client-side trigger)
  useEffect(() => {
    if (timeRemainingMs === null || timeRemainingMs > 0) return;
    if (isSubmitting || result) return;
    void handleSubmit(true);
  }, [timeRemainingMs]);

  // Session locked on server (scheduler fired) → redirect
  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status === "locked" || sessionData.status === "submitted") {
      router.replace(`/courses/${courseId}/quizzes/${quizId}`);
    }
  }, [sessionData?.status]);

  function handleSelectAnswer(questionId: string, answer: string) {
    setLocalAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // Debounced auto-save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!sessionData) return;
      void saveAnswer({
        sessionId: sessionData._id,
        questionId: questionId as Id<"questions">,
        answer,
        currentQuestionIndex: currentIndex,
      });
    }, 400);
  }

  async function handleSubmit(auto = false) {
    if (!sessionData) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setConfirmSubmit(false);
    try {
      const res = await submitSession({ sessionId: sessionData._id });
      if ("score" in res) {
        setResult({ score: res.score, maxScore: res.maxScore });
      }
      setTimeout(() => {
        router.replace(`/courses/${courseId}/quizzes/${quizId}`);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading state ──
  if (sessionData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  // ── No active session ──
  if (sessionData === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h2 className="text-xl font-bold text-slate-950">No active session</h2>
          <p className="mt-2 text-sm text-slate-500">
            Go back to the quiz page to start a new attempt.
          </p>
          <button
            onClick={() => router.replace(`/courses/${courseId}/quizzes/${quizId}`)}
            className="mt-6 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            Back to Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Submission result overlay ──
  if (result) {
    const pct = result.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-3xl border border-emerald-200 bg-white p-12 text-center max-w-md shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h2 className="text-2xl font-black text-slate-950">Quiz Submitted!</h2>
          <p className="mt-3 text-5xl font-black text-slate-950">{pct}%</p>
          <p className="mt-1 text-sm text-slate-500">
            {result.score} / {result.maxScore} marks
          </p>
          <p className="mt-6 text-xs text-slate-400">Redirecting back to quiz…</p>
        </div>
      </div>
    );
  }

  const { questions, quiz } = sessionData;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(localAnswers).filter((k) =>
    questions.some((q) => String(q._id) === k),
  ).length;
  const currentQuestion = questions[currentIndex];
  const isTimedOut = timeRemainingMs !== null && timeRemainingMs <= 0;
  const isTimeCritical = timeRemainingMs !== null && timeRemainingMs < 60_000;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {quiz.title}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-700">
              Question {currentIndex + 1} of {totalQuestions} ·{" "}
              <span className="text-slate-400">{answeredCount} answered</span>
            </p>
          </div>

          {/* Timer */}
          {quiz.durationMinutes && timeRemainingMs !== null && (
            <div
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black tabular-nums transition ${
                isTimeCritical
                  ? "bg-rose-50 text-rose-700 animate-pulse"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeRemainingMs)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-[#7c4dff] transition-all duration-300"
            style={{ width: `${(answeredCount / Math.max(totalQuestions, 1)) * 100}%` }}
          />
        </div>
      </header>

      {/* ── Question area ── */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
        {!currentQuestion ? (
          <div className="text-sm text-slate-500">No questions available.</div>
        ) : (
          <div className="flex flex-col gap-8">
            <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold leading-relaxed text-slate-950">
                  {currentIndex + 1}. {currentQuestion.prompt}
                </h2>
                <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  {currentQuestion.weighting} {currentQuestion.weighting === 1 ? "mark" : "marks"}
                </span>
              </div>

              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = localAnswers[String(currentQuestion._id)] === option;
                  return (
                    <button
                      key={option}
                      disabled={isTimedOut}
                      onClick={() => handleSelectAnswer(String(currentQuestion._id), option)}
                      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-medium transition ${
                        selected
                          ? "border-[#7c4dff] bg-[#7c4dff]/5 text-[#7c4dff]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          selected ? "border-[#7c4dff] bg-[#7c4dff]" : "border-slate-300"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              {/* Question dots */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {questions.map((q, idx) => {
                  const answered = !!localAnswers[String(q._id)];
                  return (
                    <button
                      key={q._id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-7 w-7 rounded-full text-[10px] font-black transition ${
                        idx === currentIndex
                          ? "bg-slate-950 text-white"
                          : answered
                          ? "bg-[#7c4dff]/10 text-[#7c4dff]"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setConfirmSubmit(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Submit Quiz
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit from any question */}
        {currentIndex < totalQuestions - 1 && (
          <div className="mt-10 flex justify-end">
            <button
              onClick={() => setConfirmSubmit(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Submit Quiz
            </button>
          </div>
        )}
      </main>

      {/* ── Confirm submit modal ── */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl">
            <h3 className="text-xl font-black text-slate-950">Submit Quiz?</h3>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              You have answered {answeredCount} of {totalQuestions} questions.{" "}
              {answeredCount < totalQuestions
                ? `${totalQuestions - answeredCount} question(s) are unanswered.`
                : "All questions answered."}
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Go Back
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isSubmitting ? "Submitting…" : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
