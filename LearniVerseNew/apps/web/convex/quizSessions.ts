import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No application user record exists for this session.");
  return user;
}

// ── Student starts (or resumes) a session ────────────────────────────────────

export const startSession = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "student" && user.role !== "admin") {
      throw new Error("Only students can start quiz sessions.");
    }

    // Resume an existing active session if one exists
    const existingSessions = await ctx.db
      .query("quizSessions")
      .withIndex("by_quiz_and_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentUserId", user._id),
      )
      .collect();

    const activeSession = existingSessions.find((s) => s.status === "active");
    if (activeSession) {
      return { sessionId: activeSession._id, resumed: true };
    }

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new Error("Quiz not found.");

    const now = Date.now();

    if (quiz.status !== "published") throw new Error("This quiz is not yet published.");
    if (quiz.startsAt && now < quiz.startsAt) throw new Error("This quiz has not opened yet.");
    if (quiz.endsAt && now > quiz.endsAt) throw new Error("This quiz window has closed.");

    // Check attempt limit
    const completedAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz_and_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentUserId", user._id),
      )
      .collect();

    if (completedAttempts.length >= quiz.maxAttempts) {
      throw new Error("You have used all attempts for this quiz.");
    }

    // Provision new session
    const startedAt = now;
    const endsAt = quiz.durationMinutes
      ? startedAt + quiz.durationMinutes * 60 * 1000
      : undefined;

    const sessionId = await ctx.db.insert("quizSessions", {
      quizId: args.quizId,
      studentUserId: user._id,
      startedAt,
      endsAt,
      answers: [],
      currentQuestionIndex: 0,
      status: "active",
    });

    // Schedule auto-lock at the exact moment the timer expires
    if (quiz.durationMinutes) {
      const jobId = await ctx.scheduler.runAfter(
        quiz.durationMinutes * 60 * 1000,
        internal.quizSessions.lockExpiredSession,
        { sessionId },
      );
      await ctx.db.patch(sessionId, { schedulerJobId: jobId });
    }

    return { sessionId, resumed: false };
  },
});

// ── Auto-save a single answer ─────────────────────────────────────────────────

export const saveAnswer = mutation({
  args: {
    sessionId: v.id("quizSessions"),
    questionId: v.id("questions"),
    answer: v.string(),
    currentQuestionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.studentUserId !== user._id) {
      throw new Error("Session not found.");
    }
    if (session.status !== "active") {
      throw new Error("This session is no longer active.");
    }

    // Check timer server-side — lock silently if expired
    if (session.endsAt && Date.now() > session.endsAt) {
      await ctx.db.patch(args.sessionId, { status: "locked" });
      throw new Error("Time expired — session has been locked.");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question || question.quizId !== session.quizId) {
      throw new Error("Question does not belong to this quiz session.");
    }

    const answers = [...session.answers];
    const existing = answers.findIndex((a) => a.questionId === args.questionId);
    const entry = { questionId: args.questionId, answer: args.answer, answeredAt: Date.now() };

    if (existing >= 0) {
      answers[existing] = entry;
    } else {
      answers.push(entry);
    }

    await ctx.db.patch(args.sessionId, {
      answers,
      currentQuestionIndex: args.currentQuestionIndex,
    });
  },
});

// ── Student submits manually ──────────────────────────────────────────────────

export const submitSession = mutation({
  args: { sessionId: v.id("quizSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.studentUserId !== user._id) {
      throw new Error("Session not found.");
    }
    if (session.status === "submitted") {
      const existingAttempt = session.attemptId
        ? await ctx.db.get(session.attemptId)
        : null;
      if (!existingAttempt) {
        throw new Error("Submitted session is missing its recorded attempt.");
      }
      return {
        attemptId: existingAttempt._id,
        score: existingAttempt.score,
        maxScore: existingAttempt.maxScore,
      };
    }

    const { score, maxScore } = await gradeSession(ctx, session);

    const attemptId = await ctx.db.insert("quizAttempts", {
      quizId: session.quizId,
      studentUserId: user._id,
      answers: session.answers.map(({ questionId, answer }) => ({ questionId, answer })),
      score,
      maxScore,
      submittedAt: Date.now(),
    });

    // Cancel the scheduled lock job — student submitted early
    if (session.schedulerJobId) {
      await ctx.scheduler.cancel(session.schedulerJobId);
    }

    await ctx.db.patch(args.sessionId, { status: "submitted", attemptId });

    return { score, maxScore, attemptId };
  },
});

// ── Called by the scheduler when the timer expires ───────────────────────────

export const lockExpiredSession = internalMutation({
  args: { sessionId: v.id("quizSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;

    const { score, maxScore } = await gradeSession(ctx, session);

    const attemptId = await ctx.db.insert("quizAttempts", {
      quizId: session.quizId,
      studentUserId: session.studentUserId,
      answers: session.answers.map(({ questionId, answer }) => ({ questionId, answer })),
      score,
      maxScore,
      submittedAt: Date.now(),
    });

    await ctx.db.patch(args.sessionId, { status: "locked", attemptId });
  },
});

// ── Shared grading helper ─────────────────────────────────────────────────────

async function gradeSession(
  ctx: MutationCtx,
  session: Doc<"quizSessions">,
): Promise<{ score: number; maxScore: number }> {
  const questions = await ctx.db
    .query("questions")
    .withIndex("by_quiz", (q) => q.eq("quizId", session.quizId))
    .collect();

  let score = 0;
  let maxScore = 0;

  for (const question of questions) {
    maxScore += question.weighting;
    const submitted = session.answers.find((a) => a.questionId === question._id);
    if (submitted && submitted.answer === question.correctAnswer) {
      score += question.weighting;
    }
  }

  return { score, maxScore };
}

// ── Student's active session for a quiz ──────────────────────────────────────

export const getActiveSessionForQuiz = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const sessions = await ctx.db
      .query("quizSessions")
      .withIndex("by_quiz_and_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentUserId", user._id),
      )
      .collect();

    const activeSession = sessions.find((s) => s.status === "active") ?? null;
    if (!activeSession) return null;

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;

    const questions = (
      await ctx.db
        .query("questions")
        .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
        .collect()
    )
      .sort((a, b) => a.position - b.position)
      .map(({ correctAnswer: _strip, ...q }) => q);

    return {
      ...activeSession,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        courseId: quiz.courseId,
      },
      questions,
    };
  },
});

// ── Proctoring: all active sessions for a course ─────────────────────────────

export const listActiveSessions = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can proctor.");
    }

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const allActive = (
      await Promise.all(
        quizzes.map((quiz) =>
          ctx.db
            .query("quizSessions")
            .withIndex("by_quiz_and_status", (q) =>
              q.eq("quizId", quiz._id).eq("status", "active"),
            )
            .collect(),
        ),
      )
    ).flat();

    const now = Date.now();

    return await Promise.all(
      allActive.map(async (session) => {
        const student = await ctx.db.get(session.studentUserId);
        const quiz = quizzes.find((q) => String(q._id) === String(session.quizId));

        return {
          ...session,
          student: student
            ? { _id: student._id, fullName: student.fullName, email: student.email }
            : null,
          quizTitle: quiz?.title ?? "Unknown Quiz",
          questionCount: quiz ? undefined : 0,
          answeredCount: session.answers.length,
          timeRemainingMs: session.endsAt ? Math.max(0, session.endsAt - now) : null,
        };
      }),
    );
  },
});
