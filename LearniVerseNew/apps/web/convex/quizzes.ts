import { v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to perform this action.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) {
    throw new Error("No application user record exists for this session.");
  }

  return user;
}

function calculateAvailability(
  quiz: {
    startsAt?: number;
    endsAt?: number;
    status: "draft" | "published";
  },
  now: number,
) {
  if (quiz.status !== "published") {
    return {
      available: false,
      reason: "This quiz is still in draft mode.",
    };
  }

  if (quiz.startsAt && now < quiz.startsAt) {
    return {
      available: false,
      reason: "This quiz is not open yet.",
    };
  }

  if (quiz.endsAt && now > quiz.endsAt) {
    return {
      available: false,
      reason: "This quiz is closed.",
    };
  }

  return {
    available: true,
    reason: null,
  };
}

export const listByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    const now = Date.now();

    const enriched = await Promise.all(
      quizzes.map(async (quiz) => {
        const questionCount = (
          await ctx.db
            .query("questions")
            .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
            .collect()
        ).length;
        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_quiz_and_student", (q) =>
            q.eq("quizId", quiz._id).eq("studentUserId", currentUser._id),
          )
          .collect();
        const bestAttempt =
          attempts.sort((a, b) => b.score - a.score || b.submittedAt - a.submittedAt)[0] ??
          null;
        const availability = calculateAvailability(quiz, now);

        return {
          ...quiz,
          questionCount,
          attemptsUsed: attempts.length,
          attemptsRemaining: Math.max(quiz.maxAttempts - attempts.length, 0),
          bestAttempt,
          availability,
        };
      }),
    );

    return enriched.sort((a, b) => (a.startsAt ?? a.createdAt) - (b.startsAt ?? b.createdAt));
  },
});

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    maxAttempts: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can create quizzes.");
    }

    return await ctx.db.insert("quizzes", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      durationMinutes: args.durationMinutes,
      maxAttempts: Math.max(args.maxAttempts, 1),
      status: args.status,
      createdByUserId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const addQuestion = mutation({
  args: {
    quizId: v.id("quizzes"),
    prompt: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.string(),
    weighting: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can add quiz questions.");
    }

    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    return await ctx.db.insert("questions", {
      quizId: args.quizId,
      prompt: args.prompt,
      options: args.options,
      correctAnswer: args.correctAnswer,
      weighting: Math.max(args.weighting, 1),
      position: existingQuestions.length + 1,
    });
  },
});

export const getDetail = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      return null;
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
    const course = await ctx.db.get(quiz.courseId);
    const myAttempts = attempts.filter((attempt) => attempt.studentUserId === user._id);
    const bestAttempt =
      myAttempts.sort((a, b) => b.score - a.score || b.submittedAt - a.submittedAt)[0] ?? null;
    const availability = calculateAvailability(quiz, Date.now());
    const canManage = user.role === "teacher" || user.role === "admin";

    return {
      ...quiz,
      course,
      questions: questions
        .sort((a, b) => a.position - b.position)
        .map((question) => ({
          _id: question._id,
          prompt: question.prompt,
          options: question.options,
          weighting: question.weighting,
          position: question.position,
          correctAnswer: canManage ? question.correctAnswer : undefined,
        })),
      attemptsUsed: myAttempts.length,
      attemptsRemaining: Math.max(quiz.maxAttempts - myAttempts.length, 0),
      bestAttempt,
      availability,
      canManage,
      attempts: canManage ? attempts.sort((a, b) => b.submittedAt - a.submittedAt) : [],
    };
  },
});

export const updateStatus = mutation({
  args: {
    quizId: v.id("quizzes"),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can update quiz status.");
    }
    await ctx.db.patch(args.quizId, { status: args.status });
  },
});

export const addQuestionsFromAI = mutation({
  args: {
    quizId: v.id("quizzes"),
    questions: v.array(
      v.object({
        prompt: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.string(),
        weighting: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can add quiz questions.");
    }
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
    let position = existing.length + 1;
    for (const q of args.questions) {
      await ctx.db.insert("questions", {
        quizId: args.quizId,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        weighting: Math.max(q.weighting, 1),
        position: position++,
      });
    }
    return { added: args.questions.length };
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can delete quiz questions.");
    }
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found.");
    await ctx.db.delete(args.questionId);
    // Resequence remaining questions
    const remaining = (
      await ctx.db
        .query("questions")
        .withIndex("by_quiz", (q) => q.eq("quizId", question.quizId))
        .collect()
    ).sort((a, b) => a.position - b.position);
    for (let i = 0; i < remaining.length; i++) {
      await ctx.db.patch(remaining[i]._id, { position: i + 1 });
    }
  },
});

export const submitAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        answer: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "student" && user.role !== "admin") {
      throw new Error("Only students can submit quiz attempts.");
    }

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error("Quiz not found.");
    }

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz_and_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentUserId", user._id),
      )
      .collect();

    if (attempts.length >= quiz.maxAttempts) {
      throw new Error("You have reached the maximum number of attempts for this quiz.");
    }

    const availability = calculateAvailability(quiz, Date.now());

    if (!availability.available) {
      throw new Error(availability.reason ?? "This quiz is not available.");
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    let score = 0;
    let maxScore = 0;

    for (const question of questions) {
      maxScore += question.weighting;
      const submitted = args.answers.find((answer) => answer.questionId === question._id);
      if (submitted && submitted.answer === question.correctAnswer) {
        score += question.weighting;
      }
    }

    const attemptId = await ctx.db.insert("quizAttempts", {
      quizId: args.quizId,
      studentUserId: user._id,
      answers: args.answers,
      score,
      maxScore,
      submittedAt: Date.now(),
    });

    return {
      attemptId,
      score,
      maxScore,
      attemptsUsed: attempts.length + 1,
      attemptsRemaining: Math.max(quiz.maxAttempts - (attempts.length + 1), 0),
    };
  },
});
