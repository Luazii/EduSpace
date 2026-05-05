import { v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

async function assertTeacherOrAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Only teachers and admins can capture marks.");
  }
  return user;
}

export const listStudentsByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    await assertTeacherOrAdmin(ctx);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    return await Promise.all(
      enrollments
        .filter((entry) => entry.status === "active")
        .map(async (entry) => ({
          enrollmentId: entry._id,
          student: await ctx.db.get(entry.studentUserId),
        })),
    );
  },
});

export const listMyCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await assertTeacherOrAdmin(ctx);
    if (user.role === "admin") {
      return await ctx.db.query("courses").collect();
    }

    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return [];

    return await ctx.db
      .query("courses")
      .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", profile._id))
      .collect();
  },
});

export const listMarksForCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    await assertTeacherOrAdmin(ctx);

    const marks = await ctx.db
      .query("manualMarks")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    return await Promise.all(
      marks
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (mark) => ({
          ...mark,
          student: await ctx.db.get(mark.studentUserId),
          course: await ctx.db.get(mark.courseId),
        })),
    );
  },
});

export const captureMark = mutation({
  args: {
    studentUserId: v.id("users"),
    courseId: v.id("courses"),
    assessmentName: v.string(),
    assessmentType: v.union(
      v.literal("test"),
      v.literal("exam"),
      v.literal("assignment"),
      v.literal("classwork"),
      v.literal("project"),
    ),
    termLabel: v.optional(v.string()),
    maxMark: v.number(),
    mark: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertTeacherOrAdmin(ctx);
    if (args.mark > args.maxMark) {
      throw new Error("Captured mark cannot exceed maximum mark.");
    }

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();
    const isEnrolled = enrollment.some(
      (entry) => entry.courseId === args.courseId && entry.status === "active",
    );

    if (!isEnrolled) {
      throw new Error("Student is not actively enrolled in this subject.");
    }

    const now = Date.now();
    return await ctx.db.insert("manualMarks", {
      studentUserId: args.studentUserId,
      courseId: args.courseId,
      enteredByUserId: user._id,
      assessmentName: args.assessmentName.trim(),
      assessmentType: args.assessmentType,
      termLabel: args.termLabel?.trim(),
      maxMark: args.maxMark,
      mark: args.mark,
      comment: args.comment?.trim(),
      capturedAt: now,
      updatedAt: now,
    });
  },
});

export const getStudentAcademicRecord = query({
  args: {
    studentUserId: v.id("users"),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    await assertTeacherOrAdmin(ctx);

    const marks = args.courseId
      ? await ctx.db
          .query("manualMarks")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", args.courseId!).eq("studentUserId", args.studentUserId),
          )
          .collect()
      : await ctx.db
          .query("manualMarks")
          .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
          .collect();

    const grouped = new Map<string, { courseId: Id<"courses">; courseName: string; average: number; entries: typeof marks }>();

    for (const entry of marks) {
      const course = await ctx.db.get(entry.courseId);
      if (!course) continue;
      const key = String(course._id);
      const existing = grouped.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        grouped.set(key, {
          courseId: course._id,
          courseName: course.courseName,
          average: 0,
          entries: [entry],
        });
      }
    }

    return Array.from(grouped.values()).map((group) => {
      const average =
        group.entries.reduce((sum, item) => sum + (item.mark / item.maxMark) * 100, 0) /
        group.entries.length;

      return {
        ...group,
        average: Math.round(average),
        entries: group.entries.sort((a, b) => b.updatedAt - a.updatedAt),
      };
    });
  },
});
