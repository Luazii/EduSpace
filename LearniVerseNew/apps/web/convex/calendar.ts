import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
  type: "assignment" | "quiz" | "live_session" | "meeting" | "training" | "sports";
  title: string;
  courseCode?: string;
  courseName?: string;
  date: number;
  endDate?: number;
  detail?: string;
  status?: string;
  href?: string;
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
            href: `/assignments`,
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
            href: `/courses/${enrollment.courseId}/quizzes/${q._id}`,
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
          href: `/study-sessions`,
        });
      }
    }

    // Weekly timetable classes (recurring)
    for (const enrollment of enrollments) {
      const course = await ctx.db.get(enrollment.courseId);
      if (!course) continue;

      const slots = await ctx.db
        .query("timetable")
        .withIndex("by_course", (q) => q.eq("courseId", enrollment.courseId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const slot of slots) {
        // dayOfWeek: 1=Mon..5=Fri  JS getUTCDay: 0=Sun,1=Mon..5=Fri,6=Sat
        const jsDay = slot.dayOfWeek; // 1-5 same in JS
        const fromDate = new Date(from);
        fromDate.setUTCHours(0, 0, 0, 0);
        const daysUntilFirst = (jsDay - fromDate.getUTCDay() + 7) % 7;
        const first = new Date(fromDate);
        first.setUTCDate(first.getUTCDate() + daysUntilFirst);

        const current = new Date(first);
        while (current.getTime() <= to) {
          // Convert SAST time (UTC+2) → UTC: subtract 2 hours
          const hourUTC = slot.startHour - 2;
          const eventStart = new Date(current);
          eventStart.setUTCHours(hourUTC, slot.startMinute, 0, 0);
          const eventEnd = eventStart.getTime() + slot.durationMinutes * 60_000;

          const dayName = ["", "Mon", "Tue", "Wed", "Thu", "Fri"][slot.dayOfWeek];
          const modeLabel = slot.deliveryMode === "online" ? "Online" : slot.venue ?? "In-Person";

          events.push({
            id: `timetable-${slot._id}-${current.toISOString().slice(0, 10)}`,
            type: "live_session",
            title: `${course.courseCode} — ${modeLabel}`,
            courseCode: course.courseCode,
            courseName: course.courseName,
            date: eventStart.getTime(),
            endDate: eventEnd,
            detail: slot.deliveryMode === "online" ? "Online class" : `In-person · ${slot.venue ?? "Classroom"}`,
            href: `/courses/${enrollment.courseId}`,
          });

          current.setUTCDate(current.getUTCDate() + 7);
        }
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
          href: `/bookings/my`,
        });
      }
    }

    // Sports training sessions and match fixtures
    const teamMemberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const studentTeamIds = new Set<Id<"sportsTeams">>(teamMemberships.map((m) => m.teamId));

    const sportRegs = await ctx.db
      .query("sportRegistrations")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const reg of sportRegs) {
      const teams = await ctx.db
        .query("sportsTeams")
        .withIndex("by_sport", (q) => q.eq("sportId", reg.sportId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      for (const t of teams) {
        studentTeamIds.add(t._id);
      }
    }

    for (const teamId of Array.from(studentTeamIds)) {
      const team = await ctx.db.get(teamId);
      if (!team) continue;
      const sport = await ctx.db.get(team.sportId);

      const trainingSessions = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const s of trainingSessions) {
        if (s.status !== "cancelled" && s.startTime >= from && s.startTime <= to) {
          let venueName = s.venue;
          if (s.venueId) {
            const vDoc = await ctx.db.get(s.venueId);
            if (vDoc) venueName = vDoc.name;
          }
          events.push({
            id: `training-${s._id}`,
            type: "training",
            title: `${team.name} Training — ${sport?.name ?? "Sports"}`,
            courseCode: sport?.name,
            courseName: team.name,
            date: s.startTime,
            endDate: s.endTime,
            detail: `Venue: ${venueName || "Sports Grounds"}${s.notes ? ` · ${s.notes}` : ""}`,
            status: s.status,
            href: "/sports",
          });
        }
      }

      const fixtures = await ctx.db
        .query("matchFixtures")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const f of fixtures) {
        if (f.status !== "cancelled" && f.matchTime >= from && f.matchTime <= to) {
          let venueName = f.venue;
          if (f.venueId) {
            const vDoc = await ctx.db.get(f.venueId);
            if (vDoc) venueName = vDoc.name;
          }
          events.push({
            id: `fixture-${f._id}`,
            type: "sports",
            title: `Match vs ${f.opponentName} (${f.isHomeFixture ? "Home" : "Away"})`,
            courseCode: sport?.name,
            courseName: team.name,
            date: f.matchTime,
            detail: `Venue: ${venueName || "Sports Grounds"}`,
            status: f.status,
            href: "/sports",
          });
        }
      }
    }

    return events.sort((a, b) => a.date - b.date);
  },
});
