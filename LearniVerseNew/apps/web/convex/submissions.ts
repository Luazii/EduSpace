import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    assignmentId: v.id("assignments"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "student" && user.role !== "admin") {
      throw new Error("Only students can submit assignments.");
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);

    return await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentUserId: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: metadata?.contentType,
      size: metadata?.size,
      submittedAt: Date.now(),
    });
  },
});

export const grade = mutation({
  args: {
    submissionId: v.id("submissions"),
    mark: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can grade submissions.");
    }

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const assignment = await ctx.db.get(submission.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found for this submission.");
    }

    if (args.mark < 0) {
      throw new Error("Mark cannot be negative.");
    }

    if (
      typeof assignment.maxMark === "number" &&
      args.mark > assignment.maxMark
    ) {
      throw new Error(`Mark cannot exceed ${assignment.maxMark}.`);
    }

    await ctx.db.patch(submission._id, {
      mark: args.mark,
      feedback: args.feedback?.trim() || undefined,
      gradedAt: Date.now(),
      gradedByUserId: user._id,
    });

    return await ctx.db.get(submission._id);
  },
});

export const listNeedsGrading = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can view the grading queue.");
    }

    const submissions = await ctx.db.query("submissions").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const courses = await ctx.db.query("courses").collect();
    const latestByAssignmentAndStudent = new Map<string, (typeof submissions)[number]>();

    for (const submission of [...submissions].sort(
      (a, b) => b.submittedAt - a.submittedAt,
    )) {
      const key = `${submission.assignmentId}:${submission.studentUserId}`;

      if (!latestByAssignmentAndStudent.has(key)) {
        latestByAssignmentAndStudent.set(key, submission);
      }
    }

    const latestPendingSubmissions = [...latestByAssignmentAndStudent.values()].filter(
      (submission) => typeof submission.mark !== "number",
    );

    const queue = await Promise.all(
      latestPendingSubmissions.map(async (submission) => {
        const assignment = assignments.find(
          (entry) => entry._id === submission.assignmentId,
        );
        const course = assignment
          ? courses.find((entry) => entry._id === assignment.courseId)
          : null;
        const student = await ctx.db.get(submission.studentUserId);
        const url = await ctx.storage.getUrl(submission.storageId);

        return {
          ...submission,
          url,
          assignment: assignment
            ? {
                _id: assignment._id,
                title: assignment.title,
                deadline: assignment.deadline,
                maxMark: assignment.maxMark,
              }
            : null,
          course: course
            ? {
                _id: course._id,
                courseCode: course.courseCode,
                courseName: course.courseName,
              }
            : null,
          student: student
            ? {
                _id: student._id,
                email: student.email,
                fullName: student.fullName,
              }
            : null,
        };
      }),
    );

    return queue.sort((a, b) => {
      const aDeadline = a.assignment?.deadline ?? Number.MAX_SAFE_INTEGER;
      const bDeadline = b.assignment?.deadline ?? Number.MAX_SAFE_INTEGER;

      if (aDeadline !== bDeadline) {
        return aDeadline - bDeadline;
      }

      return b.submittedAt - a.submittedAt;
    });
  },
});
