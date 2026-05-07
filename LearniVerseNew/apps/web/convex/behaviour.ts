import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

// ── helpers ──────────────────────────────────────────────────────────────────

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No user record found for this session.");
  return user;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Teacher or admin creates a merit/demerit for a student. */
export const awardRecord = mutation({
  args: {
    studentUserId: v.id("users"),
    type:          v.union(v.literal("merit"), v.literal("demerit")),
    category:      v.string(),
    description:   v.string(),
    points:        v.optional(v.number()),
    courseId:      v.optional(v.id("courses")),
    occurredAt:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "teacher" && caller.role !== "admin") {
      throw new Error("Only teachers and admins can award behaviour records.");
    }
    const now = Date.now();
    const defaultPoints = args.type === "merit" ? 1 : -1;
    return ctx.db.insert("behaviourRecords", {
      studentUserId:   args.studentUserId,
      awardedByUserId: caller._id,
      type:            args.type,
      category:        args.category,
      description:     args.description,
      points:          args.points ?? defaultPoints,
      courseId:        args.courseId,
      occurredAt:      args.occurredAt ?? now,
      createdAt:       now,
    });
  },
});

/** Admin removes an incorrect record. */
export const deleteRecord = mutation({
  args: { id: v.id("behaviourRecords") },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "admin") throw new Error("Only admins can delete behaviour records.");
    await ctx.db.delete(args.id);
  },
});

/** Admin corrects description or points on an existing record. */
export const editRecord = mutation({
  args: {
    id:          v.id("behaviourRecords"),
    category:    v.optional(v.string()),
    description: v.optional(v.string()),
    points:      v.optional(v.number()),
    occurredAt:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "admin") throw new Error("Only admins can edit behaviour records.");
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

/** All records for one student, newest first. */
export const listForStudent = query({
  args: {
    studentUserId: v.id("users"),
    limit:         v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("behaviourRecords")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .order("desc")
      .take(args.limit ?? 100);

    return Promise.all(
      records.map(async (r) => {
        const awarder = await ctx.db.get(r.awardedByUserId);
        const course  = r.courseId ? await ctx.db.get(r.courseId) : null;
        return { ...r, awarderName: awarder?.fullName ?? "Staff", courseName: course?.courseName };
      }),
    );
  },
});

/**
 * Summary for one student:
 * { merits, demerits, netPoints, categories: [{ category, count }] }
 */
export const summaryForStudent = query({
  args: { studentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("behaviourRecords")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    const merits   = records.filter((r) => r.type === "merit");
    const demerits = records.filter((r) => r.type === "demerit");
    const netPoints = records.reduce((sum, r) => sum + r.points, 0);

    const categoryMap = new Map<string, number>();
    for (const r of records) {
      categoryMap.set(r.category, (categoryMap.get(r.category) ?? 0) + 1);
    }
    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return { merits: merits.length, demerits: demerits.length, netPoints, categories };
  },
});

/** All records linked to a specific course. */
export const listForClass = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("behaviourRecords")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .collect();

    return Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentUserId);
        const awarder = await ctx.db.get(r.awardedByUserId);
        return {
          ...r,
          studentName: student?.fullName ?? "Unknown",
          awarderName: awarder?.fullName ?? "Staff",
        };
      }),
    );
  },
});

/** Admin feed of latest records across the whole school. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("behaviourRecords")
      .order("desc")
      .take(args.limit ?? 50);

    return Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentUserId);
        const awarder = await ctx.db.get(r.awardedByUserId);
        const course  = r.courseId ? await ctx.db.get(r.courseId) : null;
        return {
          ...r,
          studentName: student?.fullName ?? "Unknown",
          awarderName: awarder?.fullName ?? "Staff",
          courseName:  course?.courseName,
        };
      }),
    );
  },
});

/** All students enrolled in courses taught by this teacher, for the award panel. */
export const listMyStudents = query({
  args: {},
  handler: async (ctx) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "teacher" && caller.role !== "admin") return [];

    let courseIds: string[];

    if (caller.role === "admin") {
      // Admin can award to any enrolled student
      const allEnrollments = await ctx.db.query("enrollments").collect();
      const uniqueStudentIds = Array.from(new Set(allEnrollments.map((e) => String(e.studentUserId))));
      const students = await Promise.all(uniqueStudentIds.map((id) => ctx.db.get(id as any)));
      return students
        .filter(Boolean)
        .map((s: any) => ({ _id: s!._id, fullName: s!.fullName ?? s!.email, email: s!.email }));
    }

    // Teacher: only students enrolled in their courses
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", caller._id))
      .first();

    if (!teacherProfile) return [];

    const courses = await ctx.db
      .query("courses")
      .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", teacherProfile._id))
      .collect();

    courseIds = courses.map((c) => String(c._id));

    const enrollmentSets = await Promise.all(
      courses.map((c) =>
        ctx.db.query("enrollments").withIndex("by_course", (q) => q.eq("courseId", c._id)).collect(),
      ),
    );

    const allEnrollments = enrollmentSets.flat();
    const uniqueStudentIds = Array.from(new Set(allEnrollments.map((e) => String(e.studentUserId))));
    const students = await Promise.all(uniqueStudentIds.map((id) => ctx.db.get(id as any)));

    return students
      .filter(Boolean)
      .map((s: any) => ({ _id: s!._id, fullName: s!.fullName ?? s!.email, email: s!.email }));
  },
});
