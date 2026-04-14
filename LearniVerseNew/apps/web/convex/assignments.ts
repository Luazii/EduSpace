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

/**
 * All assignments visible to the current user across all their courses.
 * - student: assignments for courses they are actively enrolled in
 * - teacher/admin: all assignments for courses they teach / all courses
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    let courseIds: Array<import("./_generated/dataModel").Id<"courses">>;

    if (user.role === "student") {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      courseIds = enrollments.map((e) => e.courseId);
    } else if (user.role === "teacher") {
      const profile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();
      if (!profile) return [];
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", profile._id))
        .collect();
      courseIds = courses.map((c) => c._id);
    } else {
      // admin — return everything
      const courses = await ctx.db.query("courses").collect();
      courseIds = courses.map((c) => c._id);
    }

    if (courseIds.length === 0) return [];

    const assignmentArrays = await Promise.all(
      courseIds.map((cid) =>
        ctx.db
          .query("assignments")
          .withIndex("by_course", (q) => q.eq("courseId", cid))
          .filter((q) => q.eq(q.field("isPublished"), true))
          .collect(),
      ),
    );
    const assignments = assignmentArrays.flat();

    // For each assignment fetch course name + student's own submission (if student)
    return await Promise.all(
      assignments.map(async (a) => {
        const course = await ctx.db.get(a.courseId);
        let mySubmission = null;
        if (user.role === "student") {
          mySubmission = await ctx.db
            .query("submissions")
            .withIndex("by_assignment_and_student", (q) =>
              q.eq("assignmentId", a._id).eq("studentUserId", user._id),
            )
            .order("desc")
            .first();
        }
        const isOverdue = a.deadline != null && a.deadline < now && !mySubmission;
        return {
          ...a,
          courseName: course?.courseName ?? "Unknown Course",
          mySubmission,
          isOverdue,
        };
      }),
    );
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
