"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type QuizDetailClientProps = {
  courseId: string;
  quizId: string;
};

export function QuizDetailClient({ courseId, quizId }: QuizDetailClientProps) {
  const typedQuizId = quizId as Id<"quizzes">;
  const quiz = useQuery(api.quizzes.getDetail, { quizId: typedQuizId });
  const addQuestion = useMutation(api.quizzes.addQuestion);
  const submitAttempt = useMutation(api.quizzes.submitAttempt);

  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [weighting, setWeighting] = useState("1");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissionResult, setSubmissionResult] = useState<null | {
    score: number;
    maxScore: number;
    attemptsRemaining: number;
  }>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const canTakeQuiz = useMemo(() => {
    if (!quiz) {
      return false;
    }

    return (
      quiz.availability.available &&
      quiz.attemptsRemaining > 0 &&
      quiz.questions.length > 0
    );
  }, [quiz]);

  async function onAddQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedOptions = options.map((option) => option.trim()).filter(Boolean);

    if (!prompt.trim() || cleanedOptions.length < 2 || !correctAnswer.trim()) {
      return;
    }

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

  async function onSubmitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quiz) {
      return;
    }

    setIsSubmittingQuiz(true);
    setSubmissionResult(null);

    try {
      const result = await submitAttempt({
        quizId: typedQuizId,
        answers: quiz.questions.map((question) => ({
          questionId: question._id,
          answer: answers[question._id] ?? "",
        })),
      });

      setSubmissionResult({
        score: result.score,
        maxScore: result.maxScore,
        attemptsRemaining: result.attemptsRemaining,
      });
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  if (quiz === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          Loading quiz...
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Quiz not found
          </h1>
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Quiz
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {quiz.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                {quiz.course?.courseName ? <span>{quiz.course.courseName}</span> : null}
                <span>{quiz.maxAttempts} max attempts</span>
                <span>{quiz.attemptsUsed} used</span>
                {quiz.durationMinutes ? <span>{quiz.durationMinutes} min</span> : null}
              </div>
            </div>
            <Link
              href={`/courses/${courseId}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Back to classroom
            </Link>
          </div>
          {quiz.description ? (
            <p className="mt-5 max-w-4xl text-sm leading-8 text-slate-600">
              {quiz.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
            {quiz.startsAt ? <span>Opens {new Date(quiz.startsAt).toLocaleString()}</span> : null}
            {quiz.endsAt ? <span>Closes {new Date(quiz.endsAt).toLocaleString()}</span> : null}
            <span>{quiz.availability.available ? "Available" : quiz.availability.reason}</span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              Take quiz
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Questions
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Your quiz is marked on the server when you submit it, and attempt limits are enforced there too.
            </p>
            {submissionResult ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-800">
                Score: {submissionResult.score} / {submissionResult.maxScore}. Attempts remaining:{" "}
                {submissionResult.attemptsRemaining}.
              </div>
            ) : null}
            <form onSubmit={onSubmitQuiz} className="mt-6 grid gap-5">
              {quiz.questions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-500">
                  No questions have been added yet.
                </div>
              ) : (
                quiz.questions.map((question) => (
                  <article
                    key={question._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {question.position}. {question.prompt}
                      </h3>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        {question.weighting} marks
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        >
                          <input
                            type="radio"
                            name={question._id}
                            value={option}
                            checked={answers[question._id] === option}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question._id]: event.target.value,
                              }))
                            }
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {quiz.canManage && question.correctAnswer ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                        Correct answer: {question.correctAnswer}
                      </p>
                    ) : null}
                  </article>
                ))
              )}

              <button
                type="submit"
                disabled={!canTakeQuiz || isSubmittingQuiz}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmittingQuiz ? "Submitting..." : "Submit quiz"}
              </button>
            </form>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Progress
              </p>
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
                  Best score: {quiz.bestAttempt ? `${quiz.bestAttempt.score} / ${quiz.bestAttempt.maxScore}` : "No attempts yet"}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Question authoring
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Add questions
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {quiz.canManage
                  ? "Teachers and admins can add questions here. Students won't receive correct answers in their quiz payload."
                  : "Question authoring is available to teacher and admin roles."}
              </p>
              {quiz.canManage ? (
                <form onSubmit={onAddQuestion} className="mt-6 grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Prompt
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
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
                        onChange={(event) =>
                          setOptions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item,
                            ),
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
                        onChange={(event) => setCorrectAnswer(event.target.value)}
                        placeholder="Enter the exact correct option text"
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Weighting
                      <input
                        type="number"
                        min="1"
                        value={weighting}
                        onChange={(event) => setWeighting(event.target.value)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingQuestion || !prompt.trim()}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSavingQuestion ? "Saving..." : "Add question"}
                  </button>
                </form>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-500">
                  Sign in with a teacher or admin account to add quiz questions.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
