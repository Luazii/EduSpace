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

export const listByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const enriched = await Promise.all(
      assignments.map(async (assignment) => {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
          .collect();
        const latestSubmissionsByStudent = new Map<string, (typeof submissions)[number]>();

        for (const submission of [...submissions].sort(
          (a, b) => b.submittedAt - a.submittedAt,
        )) {
          if (!latestSubmissionsByStudent.has(submission.studentUserId)) {
            latestSubmissionsByStudent.set(submission.studentUserId, submission);
          }
        }

        const latestStudentSubmissions = [...latestSubmissionsByStudent.values()];

        const myLatestSubmission =
          latestStudentSubmissions
            .filter((submission) => submission.studentUserId === currentUser._id)
            .sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null;

        const submissionUrl =
          myLatestSubmission?.storageId
            ? await ctx.storage.getUrl(myLatestSubmission.storageId)
            : null;
        const reviewSubmissions =
          currentUser.role === "teacher" || currentUser.role === "admin"
            ? await Promise.all(
                latestStudentSubmissions.map(async (submission) => {
                  const student = await ctx.db.get(submission.studentUserId);
                  const url = await ctx.storage.getUrl(submission.storageId);

                  return {
                    ...submission,
                    url,
                    student: student
                      ? {
                          _id: student._id,
                          email: student.email,
                          fullName: student.fullName,
                        }
                      : null,
                  };
                }),
              )
            : [];

        return {
          ...assignment,
          submissionsCount: submissions.length,
          gradedLatestSubmissionsCount: latestStudentSubmissions.filter(
            (submission) => typeof submission.mark === "number",
          ).length,
          pendingLatestSubmissionsCount: latestStudentSubmissions.filter(
            (submission) => typeof submission.mark !== "number",
          ).length,
          myLatestSubmission: myLatestSubmission
            ? {
                ...myLatestSubmission,
                url: submissionUrl,
              }
            : null,
          latestStudentSubmissions: reviewSubmissions,
        };
      }),
    );

    return enriched.sort((a, b) => {
      const aDeadline = a.deadline ?? Number.MAX_SAFE_INTEGER;
      const bDeadline = b.deadline ?? Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    });
  },
});

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.optional(v.number()),
    maxMark: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can create assignments.");
    }

    return await ctx.db.insert("assignments", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      deadline: args.deadline,
      maxMark: args.maxMark,
      isPublished: true,
      createdByUserId: user._id,
      createdAt: Date.now(),
    });
  },
});
