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

async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") throw new Error("Only admins can manage classes.");
  return user;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const classes = await ctx.db.query("classes").collect();
    return await Promise.all(
      classes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (schoolClass) => {
          const teacher = schoolClass.classTeacherUserId
            ? await ctx.db.get(schoolClass.classTeacherUserId)
            : null;
          const assignments = await ctx.db
            .query("classAssignments")
            .withIndex("by_class", (q) => q.eq("classId", schoolClass._id))
            .collect();
          const activeAssignments = assignments.filter((entry) => entry.status === "active");

          return {
            ...schoolClass,
            teacher,
            assignedCount: activeAssignments.length,
            remainingCapacity: schoolClass.capacity - activeAssignments.length,
          };
        }),
    );
  },
});

export const listStudents = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    return await Promise.all(
      students.map(async (student) => {
        const assignment = await ctx.db
          .query("classAssignments")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .first();
        const schoolClass = assignment && assignment.status === "active"
          ? await ctx.db.get(assignment.classId)
          : null;
        return {
          ...student,
          currentClass: schoolClass,
        };
      }),
    );
  },
});

export const getRoster = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const schoolClass = await ctx.db.get(args.classId);
    if (!schoolClass) throw new Error("Class not found.");

    const assignments = await ctx.db
      .query("classAssignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const activeAssignments = assignments.filter((entry) => entry.status === "active");

    const students = await Promise.all(
      activeAssignments.map(async (entry) => {
        const student = await ctx.db.get(entry.studentUserId);
        return student
          ? {
              assignmentId: entry._id,
              student,
              assignedAt: entry.assignedAt,
            }
          : null;
      }),
    );

    return {
      ...schoolClass,
      students: students.filter(Boolean),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    gradeName: v.string(),
    academicYear: v.string(),
    capacity: v.number(),
    classTeacherUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const now = Date.now();

    return await ctx.db.insert("classes", {
      name: args.name.trim(),
      gradeName: args.gradeName.trim(),
      academicYear: args.academicYear.trim(),
      capacity: args.capacity,
      classTeacherUserId: args.classTeacherUserId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    classId: v.id("classes"),
    name: v.string(),
    gradeName: v.string(),
    academicYear: v.string(),
    capacity: v.number(),
    classTeacherUserId: v.optional(v.id("users")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const schoolClass = await ctx.db.get(args.classId);
    if (!schoolClass) throw new Error("Class not found.");

    const assignments = await ctx.db
      .query("classAssignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    const activeCount = assignments.filter((entry) => entry.status === "active").length;
    if (args.capacity < activeCount) {
      throw new Error("Capacity cannot be lower than the current assigned student count.");
    }

    await ctx.db.patch(args.classId, {
      name: args.name.trim(),
      gradeName: args.gradeName.trim(),
      academicYear: args.academicYear.trim(),
      capacity: args.capacity,
      classTeacherUserId: args.classTeacherUserId,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const assignStudent = mutation({
  args: {
    classId: v.id("classes"),
    studentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const schoolClass = await ctx.db.get(args.classId);
    if (!schoolClass) throw new Error("Class not found.");

    const currentAssignments = await ctx.db
      .query("classAssignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    const activeCount = currentAssignments.filter((entry) => entry.status === "active").length;

    if (activeCount >= schoolClass.capacity) {
      throw new Error("This class has reached capacity.");
    }

    const existingStudentAssignments = await ctx.db
      .query("classAssignments")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    for (const entry of existingStudentAssignments.filter((item) => item.status === "active")) {
      await ctx.db.patch(entry._id, { status: "removed" });
    }

    return await ctx.db.insert("classAssignments", {
      classId: args.classId,
      studentUserId: args.studentUserId,
      assignedAt: Date.now(),
      assignedByUserId: admin._id,
      status: "active",
    });
  },
});

export const removeStudent = mutation({
  args: {
    assignmentId: v.id("classAssignments"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.assignmentId, { status: "removed" });
  },
});
