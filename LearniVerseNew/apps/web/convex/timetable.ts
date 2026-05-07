import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

async function requireAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user || user.role !== "admin") throw new Error("Admin only.");
  return user;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const slots = await ctx.db.query("timetable").collect();
    return Promise.all(
      slots.map(async (slot) => {
        const course = await ctx.db.get(slot.courseId);
        return { ...slot, courseCode: course?.courseCode, courseName: course?.courseName };
      }),
    );
  },
});

export const listByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    return ctx.db
      .query("timetable")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
  },
});

// Returns all active timetable slots for a list of courseIds (used by calendar)
export const listForCourses = query({
  args: { courseIds: v.array(v.id("courses")) },
  handler: async (ctx, { courseIds }) => {
    const results = await Promise.all(
      courseIds.map((courseId) =>
        ctx.db
          .query("timetable")
          .withIndex("by_course", (q) => q.eq("courseId", courseId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect(),
      ),
    );
    return results.flat();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const upsertSlot = mutation({
  args: {
    slotId: v.optional(v.id("timetable")),
    courseId: v.id("courses"),
    dayOfWeek: v.number(),
    startHour: v.number(),
    startMinute: v.number(),
    durationMinutes: v.number(),
    deliveryMode: v.union(v.literal("online"), v.literal("in_person")),
    venue: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as any);
    const { slotId, ...fields } = args;
    if (slotId) {
      await ctx.db.patch(slotId, { ...fields, isActive: true });
      return slotId;
    }
    return ctx.db.insert("timetable", { ...fields, isActive: true, createdAt: Date.now() });
  },
});

export const deleteSlot = mutation({
  args: { slotId: v.id("timetable") },
  handler: async (ctx, { slotId }) => {
    await requireAdmin(ctx as any);
    await ctx.db.delete(slotId);
  },
});

export const toggleActive = mutation({
  args: { slotId: v.id("timetable"), isActive: v.boolean() },
  handler: async (ctx, { slotId, isActive }) => {
    await requireAdmin(ctx as any);
    await ctx.db.patch(slotId, { isActive });
  },
});

// ── Seed default timetable for all grades ────────────────────────────────────
// SA CAPS periods (SAST): P1=07:30, P2=08:30, P3=09:30, P4=11:00, P5=12:00, P6=13:40, P7=14:40
// Math: 5 periods/week (Mon-Fri P1), mix online/in-person
// English: 5 periods/week (Mon P2, Tue P3, Wed P2, Thu P4, Fri P3), mix online/in-person

const MATH_SLOTS: Array<{
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  deliveryMode: "online" | "in_person";
  venue?: string;
  meetingUrl?: string;
}> = [
  { dayOfWeek: 1, startHour: 7, startMinute: 30, deliveryMode: "in_person", venue: "Maths Room 101" },
  { dayOfWeek: 2, startHour: 7, startMinute: 30, deliveryMode: "in_person", venue: "Maths Room 101" },
  { dayOfWeek: 3, startHour: 7, startMinute: 30, deliveryMode: "online", meetingUrl: "https://meet.google.com/math-online" },
  { dayOfWeek: 4, startHour: 7, startMinute: 30, deliveryMode: "in_person", venue: "Maths Room 101" },
  { dayOfWeek: 5, startHour: 7, startMinute: 30, deliveryMode: "online", meetingUrl: "https://meet.google.com/math-online" },
];

const ENG_SLOTS: Array<{
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  deliveryMode: "online" | "in_person";
  venue?: string;
  meetingUrl?: string;
}> = [
  { dayOfWeek: 1, startHour: 8, startMinute: 30, deliveryMode: "online", meetingUrl: "https://meet.google.com/eng-online" },
  { dayOfWeek: 2, startHour: 9, startMinute: 30, deliveryMode: "in_person", venue: "English Room B" },
  { dayOfWeek: 3, startHour: 8, startMinute: 30, deliveryMode: "in_person", venue: "English Room B" },
  { dayOfWeek: 4, startHour: 11, startMinute: 0, deliveryMode: "in_person", venue: "English Room B" },
  { dayOfWeek: 5, startHour: 9, startMinute: 30, deliveryMode: "online", meetingUrl: "https://meet.google.com/eng-online" },
];

export const seedTimetable = mutation({
  args: {},
  handler: async (ctx) => {
    const grades = ["8", "9", "10", "11", "12"];
    let created = 0;

    for (const n of grades) {
      // Math course
      const mathCourse = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", `MATH-G${n}`))
        .first();

      if (mathCourse) {
        // Clear existing slots for this course first
        const existing = await ctx.db
          .query("timetable")
          .withIndex("by_course", (q) => q.eq("courseId", mathCourse._id))
          .collect();
        for (const s of existing) await ctx.db.delete(s._id);

        for (const slot of MATH_SLOTS) {
          await ctx.db.insert("timetable", {
            courseId: mathCourse._id,
            durationMinutes: 50,
            isActive: true,
            createdAt: Date.now(),
            ...slot,
          });
          created++;
        }
      }

      // English course
      const engCourse = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", `ENG-G${n}`))
        .first();

      if (engCourse) {
        const existing = await ctx.db
          .query("timetable")
          .withIndex("by_course", (q) => q.eq("courseId", engCourse._id))
          .collect();
        for (const s of existing) await ctx.db.delete(s._id);

        for (const slot of ENG_SLOTS) {
          await ctx.db.insert("timetable", {
            courseId: engCourse._id,
            durationMinutes: 50,
            isActive: true,
            createdAt: Date.now(),
            ...slot,
          });
          created++;
        }
      }
    }

    return { created };
  },
});
