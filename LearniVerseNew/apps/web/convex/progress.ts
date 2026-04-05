import { query, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to view progress.");
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

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const courses = await ctx.db.query("courses").collect();
    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    const quizzes = await ctx.db.query("quizzes").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    const finalMarks = await ctx.db
      .query("finalMarks")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    const overview = await Promise.all(
      courses.map(async (course) => {
        const courseQuizzes = quizzes.filter((quiz) => quiz.courseId === course._id);
        const courseAttempts = attempts.filter((attempt) =>
          courseQuizzes.some((quiz) => quiz._id === attempt.quizId),
        );
        const courseAssignments = assignments.filter(
          (assignment) => assignment.courseId === course._id,
        );
        const latestAssignmentSubmissions = new Map<string, (typeof submissions)[number]>();

        for (const submission of [...submissions]
          .filter((entry) =>
            courseAssignments.some(
              (assignment) => assignment._id === entry.assignmentId,
            ),
          )
          .sort((a, b) => b.submittedAt - a.submittedAt)) {
          if (!latestAssignmentSubmissions.has(submission.assignmentId)) {
            latestAssignmentSubmissions.set(submission.assignmentId, submission);
          }
        }

        const latestSubmissionList = [...latestAssignmentSubmissions.values()];
        const gradedSubmissionList = latestSubmissionList.filter(
          (submission) => typeof submission.mark === "number",
        );

        const highestScore = courseAttempts.length
          ? Math.max(...courseAttempts.map((attempt) => attempt.score))
          : null;
        const averageScore = courseAttempts.length
          ? courseAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            courseAttempts.length
          : null;
        const averageQuizPercent = courseAttempts.length
          ? courseAttempts.reduce((sum, attempt) => {
              if (!attempt.maxScore) {
                return sum;
              }

              return sum + (attempt.score / attempt.maxScore) * 100;
            }, 0) / courseAttempts.length
          : null;
        const averageAssignmentMark = gradedSubmissionList.length
          ? gradedSubmissionList.reduce(
              (sum, submission) => sum + (submission.mark ?? 0),
              0,
            ) / gradedSubmissionList.length
          : null;
        const averageAssignmentPercent = gradedSubmissionList.length
          ? gradedSubmissionList.reduce((sum, submission) => {
              const assignment = courseAssignments.find(
                (entry) => entry._id === submission.assignmentId,
              );
              const denominator = assignment?.maxMark ?? submission.mark ?? 0;

              if (!denominator) {
                return sum;
              }

              return sum + ((submission.mark ?? 0) / denominator) * 100;
            }, 0) / gradedSubmissionList.length
          : null;

        const quizWeight = course.quizWeight ?? 50;
        const assignmentWeight = course.assignmentWeight ?? 50;

        const weightedAverage =
          (averageQuizPercent !== null && averageAssignmentPercent !== null)
            ? (averageQuizPercent * quizWeight) / 100 +
              (averageAssignmentPercent * assignmentWeight) / 100
            : null;

        return {
          courseId: course._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          quizWeight,
          assignmentWeight,
          quizCount: courseQuizzes.length,
          attemptsCount: courseAttempts.length,
          highestScore,
          averageScore,
          averageQuizPercent,
          assignmentCount: courseAssignments.length,
          submittedAssignmentsCount: latestSubmissionList.length,
          gradedAssignmentsCount: gradedSubmissionList.length,
          pendingAssignmentsCount: latestSubmissionList.filter(
            (submission) => typeof submission.mark !== "number",
          ).length,
          averageAssignmentMark,
          averageAssignmentPercent,
          weightedAverage,
          finalMark:
            finalMarks.find(
              (entry) =>
                entry.courseId === course._id && entry.status === "published",
            ) ?? null,
        };
      }),
    );

    return overview
      .filter(
        (entry) =>
          entry.quizCount > 0 ||
          entry.attemptsCount > 0 ||
          entry.assignmentCount > 0 ||
          entry.submittedAssignmentsCount > 0,
      )
      .sort((a, b) => a.courseName.localeCompare(b.courseName));
  },
});

export const getAcademicRecord = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const records = await ctx.db
      .query("finalMarks")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    const result = [];

    for (const record of records) {
      const course = await ctx.db.get(record.courseId);
      if (!course) continue;

      result.push({
        _id: record._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        mark: record.computedFinalMark,
        publishedAt: record.publishedAt,
        notes: record.notes,
      });
    }

    return result.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  },
});
