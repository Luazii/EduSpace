import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No user record found.");
  return user;
}

export type CalendarEvent = {
  id: string;
  type: "assignment" | "quiz" | "live_session" | "meeting";
  title: string;
  courseCode?: string;
  courseName?: string;
  date: number;
  endDate?: number;
  detail?: string;
  status?: string;
};

export const getStudentCalendar = query({
  args: {
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student") return [];

    const now = Date.now();
    const from = args.fromDate ?? now - 7 * 24 * 60 * 60 * 1000;
    const to = args.toDate ?? now + 60 * 24 * 60 * 60 * 1000;

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const events: CalendarEvent[] = [];

    for (const enrollment of enrollments) {
      const course = await ctx.db.get(enrollment.courseId);
      if (!course) continue;

      // Assignment deadlines
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_course", (q) => q.eq("courseId", enrollment.courseId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();

      for (const a of assignments) {
        if (a.deadline && a.deadline >= from && a.deadline <= to) {
          events.push({
            id: `assignment-${a._id}`,
            type: "assignment",
            title: a.title,
            courseCode: course.courseCode,
            courseName: course.courseName,
            date: a.deadline,
            detail: `Max mark: ${a.maxMark ?? "—"}`,
          });
        }
      }

      // Quiz windows
      const quizzes = await ctx.db
        .query("quizzes")
        .withIndex("by_course", (q) => q.eq("courseId", enrollment.courseId))
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      for (const q of quizzes) {
        const quizDate = q.startsAt ?? q.endsAt;
        if (quizDate && quizDate >= from && quizDate <= to) {
          events.push({
            id: `quiz-${q._id}`,
            type: "quiz",
            title: q.title,
            courseCode: course.courseCode,
            courseName: course.courseName,
            date: q.startsAt ?? quizDate,
            endDate: q.endsAt,
            detail: q.durationMinutes ? `${q.durationMinutes} min · ${q.maxAttempts} attempt(s)` : undefined,
            status: q.status,
          });
        }
      }
    }

    // Live sessions
    const sessions = await ctx.db.query("liveSessions").collect();
    for (const s of sessions) {
      if (s.startTime >= from && s.startTime <= to) {
        const course = s.courseId ? await ctx.db.get(s.courseId) : null;
        events.push({
          id: `session-${s._id}`,
          type: "live_session",
          title: s.title,
          courseCode: course?.courseCode,
          courseName: course?.courseName,
          date: s.startTime,
          endDate: s.endTime ?? undefined,
          status: s.status,
        });
      }
    }

    // Parent-teacher meetings the student is a participant in
    const meetings = await ctx.db.query("meetings").collect();
    for (const m of meetings) {
      if (
        m.startTime >= from &&
        m.startTime <= to &&
        m.participantIds.some((id) => id === user._id)
      ) {
        events.push({
          id: `meeting-${m._id}`,
          type: "meeting",
          title: m.title,
          date: m.startTime,
          endDate: m.endTime ?? undefined,
          status: m.status,
        });
      }
    }

    return events.sort((a, b) => a.date - b.date);
  },
});
