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
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found.");
    }
    if (!assignment.isPublished) {
      throw new Error("This assignment is not available for submissions yet.");
    }
    if (assignment.deadline && Date.now() > assignment.deadline) {
      throw new Error("The submission deadline has passed.");
    }

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    const isEnrolled = enrollment.some(
      (entry) => entry.courseId === assignment.courseId && entry.status === "active",
    );
    if (!isEnrolled && user.role !== "admin") {
      throw new Error("You are not enrolled in this subject.");
    }

    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentUserId: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: metadata?.contentType,
      size: metadata?.size,
      submittedAt: Date.now(),
    });

    // Notify the course teacher that a new submission arrived
    if (assignment) {
      const course = await ctx.db.get(assignment.courseId);
      const teacherProfile = course?.teacherProfileId
        ? await ctx.db.get(course.teacherProfileId)
        : null;
      const teacherUser = teacherProfile
        ? await ctx.db.get(teacherProfile.userId)
        : null;

      if (teacherUser) {
        await ctx.db.insert("notifications", {
          userId: teacherUser._id,
          title: "New submission received",
          body: `${user.fullName ?? user.email} submitted "${assignment.title}"`,
          type: "grade",
          link: `/assignments`,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return submissionId;
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

    // Notify the student that their work has been graded
    const pct = assignment.maxMark
      ? ` (${Math.round((args.mark / assignment.maxMark) * 100)}%)`
      : "";
    await ctx.db.insert("notifications", {
      userId: submission.studentUserId,
      title: "Assignment graded",
      body: `"${assignment.title}" was graded: ${args.mark}${assignment.maxMark ? `/${assignment.maxMark}` : ""}${pct}`,
      type: "grade",
      link: `/assignments`,
      isRead: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(submission._id);
  },
});

// Flip isReleased = true so the student's dashboard reveals the mark instantly
export const releaseGrade = mutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can release grades.");
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");
    if (typeof submission.mark !== "number") {
      throw new Error("Cannot release a grade that has not been set yet.");
    }

    await ctx.db.patch(args.submissionId, { isReleased: true });

    // Notify the student their grade is now visible
    const assignment = await ctx.db.get(submission.assignmentId);
    const pct = assignment?.maxMark
      ? ` (${Math.round((submission.mark / assignment.maxMark) * 100)}%)`
      : "";

    await ctx.db.insert("notifications", {
      userId: submission.studentUserId,
      title: "Grade released",
      body: `Your grade for "${assignment?.title ?? "assignment"}" is now available: ${submission.mark}${assignment?.maxMark ? `/${assignment.maxMark}` : ""}${pct}`,
      type: "grade",
      link: `/assignments`,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

export const listForAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can view all submissions for an assignment.");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found.");

    const course = await ctx.db.get(assignment.courseId);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", assignment.courseId))
      .collect();

    const allSubmissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const latestByStudent = new Map<string, (typeof allSubmissions)[number]>();
    for (const sub of [...allSubmissions].sort((a, b) => b.submittedAt - a.submittedAt)) {
      if (!latestByStudent.has(String(sub.studentUserId))) {
        latestByStudent.set(String(sub.studentUserId), sub);
      }
    }

    const rows = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentUserId);
        const submission = latestByStudent.get(String(enrollment.studentUserId)) ?? null;
        const url = submission?.storageId ? await ctx.storage.getUrl(submission.storageId) : null;
        return {
          studentUserId: enrollment.studentUserId,
          studentName: student?.fullName ?? null,
          studentEmail: student?.email ?? "",
          submission: submission ? { ...submission, url } : null,
          isGraded: typeof submission?.mark === "number",
        };
      }),
    );

    return {
      assignment: {
        ...assignment,
        course: course
          ? { _id: course._id, courseName: course.courseName, courseCode: course.courseCode }
          : null,
      },
      rows: rows.sort((a, b) => {
        if (a.isGraded !== b.isGraded) return a.isGraded ? 1 : -1;
        return (a.studentName ?? a.studentEmail).localeCompare(b.studentName ?? b.studentEmail);
      }),
      gradedCount: rows.filter((r) => r.isGraded).length,
      totalCount: rows.length,
    };
  },
});

export const listNeedsGrading = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can view the grading queue.");
    }

    // Resolve the courses this user is responsible for
    let courseIds: Set<string>;

    if (user.role === "teacher") {
      const profile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();

      if (!profile) return [];

      const teacherCourses = await ctx.db
        .query("courses")
        .withIndex("by_teacher_profile", (q) =>
          q.eq("teacherProfileId", profile._id),
        )
        .collect();

      courseIds = new Set(teacherCourses.map((c) => String(c._id)));
    } else {
      // Admin sees everything — build the full course id set
      const allCourses = await ctx.db.query("courses").take(500);
      courseIds = new Set(allCourses.map((c) => String(c._id)));
    }

    if (courseIds.size === 0) return [];

    // Fetch assignments only for the resolved courses
    const allAssignments = await ctx.db.query("assignments").collect();
    const relevantAssignments = allAssignments.filter((a) =>
      courseIds.has(String(a.courseId)),
    );

    if (relevantAssignments.length === 0) return [];

    const assignmentIdSet = new Set(relevantAssignments.map((a) => String(a._id)));
    const courseMap = new Map(
      (await ctx.db.query("courses").take(500)).map((c) => [String(c._id), c]),
    );

    // Collect only submissions for relevant assignments
    const allSubmissions = await ctx.db.query("submissions").collect();
    const relevantSubmissions = allSubmissions.filter((s) =>
      assignmentIdSet.has(String(s.assignmentId)),
    );

    // Keep the latest submission per (assignment, student) pair
    const latestByKey = new Map<string, (typeof relevantSubmissions)[number]>();
    for (const sub of [...relevantSubmissions].sort(
      (a, b) => b.submittedAt - a.submittedAt,
    )) {
      const key = `${sub.assignmentId}:${sub.studentUserId}`;
      if (!latestByKey.has(key)) latestByKey.set(key, sub);
    }

    const pendingSubmissions = [...latestByKey.values()].filter(
      (s) => typeof s.mark !== "number",
    );

    const queue = await Promise.all(
      pendingSubmissions.map(async (submission) => {
        const assignment = relevantAssignments.find(
          (a) => String(a._id) === String(submission.assignmentId),
        );
        const course = assignment
          ? courseMap.get(String(assignment.courseId)) ?? null
          : null;
        const student = await ctx.db.get(submission.studentUserId);
        const url = submission.storageId ? await ctx.storage.getUrl(submission.storageId) : null;

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

      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      return b.submittedAt - a.submittedAt;
    });
  },
});
