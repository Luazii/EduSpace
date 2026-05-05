import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to view reports.");
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

async function assertTeacher(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  if (user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Only teachers and admins can view assessment reports.");
  }

  return user;
}

type CourseAssessmentData = {
  attempts: Array<Doc<"quizAttempts">>;
  assignments: Array<Doc<"assignments">>;
  course: Doc<"courses">;
  enrollments: Array<Doc<"enrollments">>;
  finalMarks: Array<Doc<"finalMarks">>;
  manualMarks: Array<Doc<"manualMarks">>;
  quizzes: Array<Doc<"quizzes">>;
  studentIds: Array<Id<"users">>;
  submissions: Array<Doc<"submissions">>;
  usersById: Map<string, Doc<"users">>;
};

function roundMark(value: number | null) {
  if (value === null) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

async function getCourseAssessmentData(
  ctx: QueryCtx | MutationCtx,
  courseId: Id<"courses">,
): Promise<CourseAssessmentData> {
  const course = await ctx.db.get(courseId);

  if (!course) {
    throw new Error("Course not found.");
  }

  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  const assignments = await ctx.db
    .query("assignments")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  const quizzes = await ctx.db
    .query("quizzes")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  const finalMarks = await ctx.db
    .query("finalMarks")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  const manualMarks = await ctx.db
    .query("manualMarks")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  const assignmentIds = new Set(assignments.map((assignment) => String(assignment._id)));
  const quizIds = new Set(quizzes.map((quiz) => String(quiz._id)));
  const submissions = (await ctx.db.query("submissions").collect()).filter((submission) =>
    assignmentIds.has(String(submission.assignmentId)),
  );
  const attempts = (await ctx.db.query("quizAttempts").collect()).filter((attempt) =>
    quizIds.has(String(attempt.quizId)),
  );
  const studentIdMap = new Map<string, Id<"users">>();

  for (const enrollment of enrollments) {
    studentIdMap.set(String(enrollment.studentUserId), enrollment.studentUserId);
  }

  for (const submission of submissions) {
    studentIdMap.set(String(submission.studentUserId), submission.studentUserId);
  }

  for (const attempt of attempts) {
    studentIdMap.set(String(attempt.studentUserId), attempt.studentUserId);
  }

  for (const finalMark of finalMarks) {
    studentIdMap.set(String(finalMark.studentUserId), finalMark.studentUserId);
  }
  for (const manualMark of manualMarks) {
    studentIdMap.set(String(manualMark.studentUserId), manualMark.studentUserId);
  }

  const studentIds = [...studentIdMap.values()];
  const users = await Promise.all(studentIds.map((studentId) => ctx.db.get(studentId)));
  const usersById = new Map<string, Doc<"users">>();

  for (const user of users) {
    if (user) {
      usersById.set(String(user._id), user);
    }
  }

  return {
    attempts,
    assignments,
    course,
    enrollments,
    finalMarks,
    manualMarks,
    quizzes,
    studentIds,
    submissions,
    usersById,
  };
}

function buildStudentReportRow(
  data: CourseAssessmentData,
  studentUserId: Id<"users">,
) {
  const assignmentById = new Map(
    data.assignments.map((assignment) => [String(assignment._id), assignment]),
  );
  const latestSubmissionByAssignment = new Map<string, Doc<"submissions">>();

  for (const submission of [...data.submissions]
    .filter((entry) => entry.studentUserId === studentUserId)
    .sort((a, b) => b.submittedAt - a.submittedAt)) {
    const key = String(submission.assignmentId);

    if (!latestSubmissionByAssignment.has(key)) {
      latestSubmissionByAssignment.set(key, submission);
    }
  }

  const latestSubmissions = [...latestSubmissionByAssignment.values()];
  const gradedSubmissions = latestSubmissions.filter(
    (submission) => typeof submission.mark === "number",
  );
  const averageAssignmentPercent = gradedSubmissions.length
    ? gradedSubmissions.reduce((sum, submission) => {
        const assignment = assignmentById.get(String(submission.assignmentId));
        const denominator = assignment?.maxMark ?? submission.mark ?? 0;

        if (!denominator) {
          return sum;
        }

        return sum + ((submission.mark ?? 0) / denominator) * 100;
      }, 0) / gradedSubmissions.length
    : null;
  const averageAssignmentMark = gradedSubmissions.length
    ? gradedSubmissions.reduce((sum, submission) => sum + (submission.mark ?? 0), 0) /
      gradedSubmissions.length
    : null;
  const bestAttemptByQuiz = new Map<string, Doc<"quizAttempts">>();

  for (const attempt of [...data.attempts]
    .filter((entry) => entry.studentUserId === studentUserId)
    .sort((a, b) => b.score - a.score || b.submittedAt - a.submittedAt)) {
    const key = String(attempt.quizId);

    if (!bestAttemptByQuiz.has(key)) {
      bestAttemptByQuiz.set(key, attempt);
    }
  }

  const bestAttempts = [...bestAttemptByQuiz.values()];
  const averageQuizPercent = bestAttempts.length
    ? bestAttempts.reduce((sum, attempt) => {
        if (!attempt.maxScore) {
          return sum;
        }

        return sum + (attempt.score / attempt.maxScore) * 100;
      }, 0) / bestAttempts.length
    : null;
  const averageQuizScore = bestAttempts.length
    ? bestAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / bestAttempts.length
    : null;
  const aWeight = data.course.assignmentWeight ?? 50;
  const qWeight = data.course.quizWeight ?? 50;
  const studentManualMarks = data.manualMarks.filter((entry) => entry.studentUserId === studentUserId);
  const averageManualPercent = studentManualMarks.length
    ? studentManualMarks.reduce((sum, entry) => sum + (entry.mark / entry.maxMark) * 100, 0) /
      studentManualMarks.length
    : null;
  const computedFinalMark =
    averageAssignmentPercent !== null && averageQuizPercent !== null
      ? (averageAssignmentPercent * aWeight + averageQuizPercent * qWeight) / 100
      : averageAssignmentPercent ?? averageQuizPercent ?? averageManualPercent;
  const storedFinalMark =
    data.finalMarks.find((mark) => mark.studentUserId === studentUserId) ?? null;
  const effectiveFinalMark =
    storedFinalMark?.overrideMark ??
    storedFinalMark?.computedFinalMark ??
    computedFinalMark;
  const student = data.usersById.get(String(studentUserId)) ?? null;
  const enrollment =
    data.enrollments.find((entry) => entry.studentUserId === studentUserId) ?? null;

  return {
    studentUserId,
    student,
    enrollmentStatus: enrollment?.status ?? "not_enrolled",
    assignmentCount: data.assignments.length,
    submittedAssignmentsCount: latestSubmissions.length,
    gradedAssignmentsCount: gradedSubmissions.length,
    pendingAssignmentsCount: latestSubmissions.filter(
      (submission) => typeof submission.mark !== "number",
    ).length,
    averageAssignmentMark: roundMark(averageAssignmentMark),
    averageAssignmentPercent: roundMark(averageAssignmentPercent),
    quizCount: data.quizzes.length,
    completedQuizCount: bestAttempts.length,
    quizAttemptsCount: data.attempts.filter((entry) => entry.studentUserId === studentUserId)
      .length,
    averageQuizScore: roundMark(averageQuizScore),
    averageQuizPercent: roundMark(averageQuizPercent),
    manualAssessmentCount: studentManualMarks.length,
    averageManualPercent: roundMark(averageManualPercent),
    computedFinalMark: roundMark(computedFinalMark),
    finalMark: storedFinalMark
      ? {
          ...storedFinalMark,
          effectiveMark: roundMark(effectiveFinalMark),
        }
      : null,
    effectiveFinalMark: roundMark(effectiveFinalMark),
    isAtRisk:
      typeof effectiveFinalMark === "number" ? effectiveFinalMark < 50 : false,
  };
}

function buildCourseSummary(
  rows: Array<ReturnType<typeof buildStudentReportRow>>,
) {
  const finalMarks = rows
    .map((row) => row.effectiveFinalMark)
    .filter((value): value is number => typeof value === "number");
  const publishedRows = rows.filter((row) => row.finalMark?.status === "published");

  return {
    studentCount: rows.length,
    publishedFinalMarksCount: publishedRows.length,
    draftFinalMarksCount: rows.filter(
      (row) => row.finalMark?.status !== "published",
    ).length,
    averageFinalMark: finalMarks.length
      ? roundMark(finalMarks.reduce((sum, value) => sum + value, 0) / finalMarks.length)
      : null,
    atRiskCount: rows.filter((row) => row.isAtRisk).length,
    readyToPublishCount: rows.filter(
      (row) =>
        row.finalMark?.status !== "published" &&
        typeof row.effectiveFinalMark === "number",
    ).length,
  };
}

async function upsertStoredFinalMark(
  ctx: MutationCtx,
  userId: Id<"users">,
  courseId: Id<"courses">,
  studentUserId: Id<"users">,
  options?: {
    clearOverride?: boolean;
    notes?: string;
    overrideMark?: number;
    status?: "draft" | "published";
  },
) {
  const data = await getCourseAssessmentData(ctx, courseId);
  const row = buildStudentReportRow(data, studentUserId);
  const existing =
    data.finalMarks.find((mark) => mark.studentUserId === studentUserId) ?? null;
  const overrideMark = options?.clearOverride
    ? undefined
    : options?.overrideMark ?? existing?.overrideMark;

  if (
    typeof (overrideMark ?? row.computedFinalMark) !== "number" &&
    typeof row.averageAssignmentPercent !== "number" &&
    typeof row.averageQuizPercent !== "number"
  ) {
    throw new Error("There is not enough assessment data to store a final mark yet.");
  }

  const payload = {
    courseId,
    studentUserId,
    computedAssignmentPercent: row.averageAssignmentPercent ?? undefined,
    computedQuizPercent: row.averageQuizPercent ?? undefined,
    computedFinalMark: row.computedFinalMark ?? undefined,
    overrideMark,
    notes: options?.notes?.trim() || existing?.notes,
    status: options?.status ?? existing?.status ?? "draft",
    updatedAt: Date.now(),
    publishedAt:
      options?.status === "published"
        ? Date.now()
        : options?.status === "draft"
          ? undefined
        : existing?.publishedAt,
    publishedByUserId:
      options?.status === "published"
        ? userId
        : options?.status === "draft"
          ? undefined
        : existing?.publishedByUserId,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return await ctx.db.get(existing._id);
  }

  const recordId = await ctx.db.insert("finalMarks", payload);
  return await ctx.db.get(recordId);
}

export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    await assertTeacher(ctx);
    const courses = await ctx.db.query("courses").collect();
    const summaries = await Promise.all(
      courses.map(async (course) => {
        const data = await getCourseAssessmentData(ctx, course._id);
        const rows = data.studentIds.map((studentId) =>
          buildStudentReportRow(data, studentId),
        );

        return {
          ...course,
          ...buildCourseSummary(rows),
        };
      }),
    );

    return summaries.sort((a, b) => {
      const aAverage = a.averageFinalMark ?? -1;
      const bAverage = b.averageFinalMark ?? -1;

      if (aAverage !== bAverage) {
        return bAverage - aAverage;
      }

      return a.courseName.localeCompare(b.courseName);
    });
  },
});

export const getCourseReport = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    await assertTeacher(ctx);
    const data = await getCourseAssessmentData(ctx, args.courseId);
    const rows = data.studentIds
      .map((studentId) => buildStudentReportRow(data, studentId))
      .sort((a, b) => {
        const aName = a.student?.fullName ?? a.student?.email ?? "";
        const bName = b.student?.fullName ?? b.student?.email ?? "";
        return aName.localeCompare(bName);
      });

    return {
      course: data.course,
      summary: buildCourseSummary(rows),
      rows,
    };
  },
});

export const saveFinalMarkDraft = mutation({
  args: {
    courseId: v.id("courses"),
    studentUserId: v.id("users"),
    overrideMark: v.optional(v.number()),
    notes: v.optional(v.string()),
    clearOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await assertTeacher(ctx);

    return await upsertStoredFinalMark(ctx, user._id, args.courseId, args.studentUserId, {
      clearOverride: args.clearOverride,
      notes: args.notes,
      overrideMark: args.overrideMark,
      status: "draft",
    });
  },
});

export const publishStudentFinalMark = mutation({
  args: {
    courseId: v.id("courses"),
    studentUserId: v.id("users"),
    overrideMark: v.optional(v.number()),
    notes: v.optional(v.string()),
    clearOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await assertTeacher(ctx);

    return await upsertStoredFinalMark(ctx, user._id, args.courseId, args.studentUserId, {
      clearOverride: args.clearOverride,
      notes: args.notes,
      overrideMark: args.overrideMark,
      status: "published",
    });
  },
});

export const publishCourseFinalMarks = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const user = await assertTeacher(ctx);
    const data = await getCourseAssessmentData(ctx, args.courseId);
    const publishableRows = data.studentIds
      .map((studentId) => buildStudentReportRow(data, studentId))
      .filter((row) => typeof row.effectiveFinalMark === "number");

    for (const row of publishableRows) {
      await upsertStoredFinalMark(ctx, user._id, args.courseId, row.studentUserId, {
        status: "published",
      });
    }

    return {
      publishedCount: publishableRows.length,
    };
  },
});
