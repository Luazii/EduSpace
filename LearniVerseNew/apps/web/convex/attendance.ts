import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No user record found.");
  return user;
}

// ── Teacher: mark attendance ──────────────────────────────────────────────────

export const listEnrolledStudents = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") throw new Error("Unauthorised.");
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    return Promise.all(
      enrollments.map(async (e) => {
        const student = await ctx.db.get(e.studentUserId);
        return { userId: e.studentUserId, fullName: student?.fullName ?? student?.email ?? "Unknown" };
      }),
    );
  },
});

export const getSessionAttendance = query({
  args: { courseId: v.id("courses"), sessionDate: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") throw new Error("Unauthorised.");
    const dayStart = new Date(args.sessionDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(args.sessionDate);
    dayEnd.setHours(23, 59, 59, 999);

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_course_and_date", (q) => q.eq("courseId", args.courseId).eq("sessionDate", args.sessionDate))
      .collect();
    return records;
  },
});

export const markAttendance = mutation({
  args: {
    courseId: v.id("courses"),
    sessionDate: v.number(),
    records: v.array(
      v.object({
        studentUserId: v.id("users"),
        status: v.union(
          v.literal("present"),
          v.literal("absent"),
          v.literal("late"),
          v.literal("excused"),
        ),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") throw new Error("Unauthorised.");
    const now = Date.now();

    for (const rec of args.records) {
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_course_and_date", (q) =>
          q.eq("courseId", args.courseId).eq("sessionDate", args.sessionDate),
        )
        .filter((q) => q.eq(q.field("studentUserId"), rec.studentUserId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: rec.status,
          notes: rec.notes,
          markedByUserId: user._id,
          markedAt: now,
        });
      } else {
        await ctx.db.insert("attendance", {
          courseId: args.courseId,
          studentUserId: rec.studentUserId,
          sessionDate: args.sessionDate,
          status: rec.status,
          notes: rec.notes,
          markedByUserId: user._id,
          markedAt: now,
        });
      }
    }
  },
});

// ── Student/Parent: view attendance ──────────────────────────────────────────

export const getMyAttendance = query({
  args: { studentUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);

    let targetId = caller._id;
    if (args.studentUserId) {
      if (caller.role === "admin" || caller.role === "teacher") {
        targetId = args.studentUserId;
      } else if (caller.role === "parent") {
        const link = await ctx.db
          .query("parentStudentLinks")
          .withIndex("by_parent", (q) => q.eq("parentId", caller._id))
          .filter((q) => q.eq(q.field("studentId"), args.studentUserId!))
          .first();
        if (!link) throw new Error("Access denied.");
        targetId = args.studentUserId;
      }
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", targetId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return Promise.all(
      enrollments.map(async (e) => {
        const course = await ctx.db.get(e.courseId);
        const records = await ctx.db
          .query("attendance")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", e.courseId).eq("studentUserId", targetId),
          )
          .collect();

        const total = records.length;
        const present = records.filter((r) => r.status === "present" || r.status === "late").length;
        const absent = records.filter((r) => r.status === "absent").length;
        const percent = total > 0 ? Math.round((present / total) * 100) : null;

        return {
          courseId: e.courseId,
          courseName: course?.courseName ?? "Unknown",
          courseCode: course?.courseCode ?? "",
          total,
          present,
          absent,
          excused: records.filter((r) => r.status === "excused").length,
          late: records.filter((r) => r.status === "late").length,
          percent,
          records: records
            .sort((a, b) => b.sessionDate - a.sessionDate)
            .map((r) => ({ _id: r._id, sessionDate: r.sessionDate, status: r.status, notes: r.notes ?? null })),
        };
      }),
    );
  },
});
