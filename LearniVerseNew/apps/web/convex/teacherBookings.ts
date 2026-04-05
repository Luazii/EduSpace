import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── auth helpers ───────────────────────────────────────────────────────────

// Mutations — throws when unauthenticated
async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No user record found.");
  return user;
}

// Queries — returns null when unauthenticated (prevents sign-out errors)
async function getOptionalUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return (
    (await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first()) ?? null
  );
}

// ─── availability defaults ──────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  slotDurationMinutes: 30,
  workDayStart: "08:00",
  workDayEnd: "16:00",
  workDays: [1, 2, 3, 4, 5], // Mon=1 … Fri=5
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function generateSlots(
  dateStr: string,
  settings: { workDayStart: string; workDayEnd: string; slotDurationMinutes: number },
): { startTime: number; endTime: number }[] {
  const base = new Date(`${dateStr}T00:00:00`).getTime();
  const startMin = toMinutes(settings.workDayStart);
  const endMin = toMinutes(settings.workDayEnd);
  const dur = settings.slotDurationMinutes;
  const slots: { startTime: number; endTime: number }[] = [];
  for (let m = startMin; m + dur <= endMin; m += dur) {
    slots.push({ startTime: base + m * 60_000, endTime: base + (m + dur) * 60_000 });
  }
  return slots;
}

function jsToIsoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

async function notify(ctx: MutationCtx, userId: Id<"users">, title: string, body: string) {
  await ctx.db.insert("notifications", {
    userId, title, body, type: "booking", isRead: false, createdAt: Date.now(),
  });
}

function generateMeetingLink(): string {
  return `https://meet.jit.si/learniver-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── helper: who is the "respondent" for a booking ─────────────────────────
// Convention: teacherUserId is ALWAYS the teacher.
// initiatedBy tells us who created the request.
// Respondent = the party who must accept/reject:
//   - student/parent initiated → teacher responds
//   - teacher initiated        → studentUserId (student or parent) responds

function getRespondentId(
  booking: { teacherUserId: Id<"users">; studentUserId: Id<"users">; initiatedBy?: string },
): Id<"users"> {
  return booking.initiatedBy === "teacher"
    ? booking.studentUserId
    : booking.teacherUserId;
}

function getInitiatorId(
  booking: { teacherUserId: Id<"users">; studentUserId: Id<"users">; initiatedBy?: string },
): Id<"users"> {
  return booking.initiatedBy === "teacher"
    ? booking.teacherUserId
    : booking.studentUserId;
}

// ─── queries ────────────────────────────────────────────────────────────────

/** Teachers for students/parents to browse and book. */
export const listTeachers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "teacher"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * For teachers: the students and parents they can book meetings with.
 * Students come from course enrollments; parents come from parent-student links.
 */
export const listMyStudentsAndParents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) return { students: [], parents: [] };

    // Find teacher's courses via teacherProfile
    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    let studentIds: Id<"users">[] = [];

    if (profile) {
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", profile._id))
        .collect();

      const enrollmentArrays = await Promise.all(
        courses.map((c) =>
          ctx.db
            .query("enrollments")
            .withIndex("by_course", (q) => q.eq("courseId", c._id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect(),
        ),
      );
      const uniqueStudentIds = new Set(enrollmentArrays.flat().map((e) => e.studentUserId));
      studentIds = [...uniqueStudentIds];
    }

    const students = (await Promise.all(studentIds.map((id) => ctx.db.get(id)))).filter(Boolean);

    // Parents linked to those students
    const parentLinks = await Promise.all(
      studentIds.map((sid) =>
        ctx.db
          .query("parentStudentLinks")
          .withIndex("by_student", (q) => q.eq("studentId", sid))
          .collect(),
      ),
    );
    const uniqueParentIds = new Set(parentLinks.flat().map((l) => l.parentId));
    const parents = (await Promise.all([...uniqueParentIds].map((id) => ctx.db.get(id)))).filter(Boolean);

    return { students, parents };
  },
});

/** Teacher availability settings (or defaults). */
export const getTeacherSettings = query({
  args: { teacherUserId: v.id("users") },
  handler: async (ctx, { teacherUserId }) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;
    const saved = await ctx.db
      .query("teacherAvailabilitySettings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", teacherUserId))
      .first();
    return saved ?? { ...DEFAULT_SETTINGS, teacherUserId };
  },
});

/**
 * Available slots for a teacher on a date.
 * teacherUserId is always the teacher, regardless of who is initiating.
 */
export const getAvailableSlots = query({
  args: { teacherUserId: v.id("users"), date: v.string() },
  handler: async (ctx, { teacherUserId, date }) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const settings =
      (await ctx.db
        .query("teacherAvailabilitySettings")
        .withIndex("by_teacher", (q) => q.eq("teacherUserId", teacherUserId))
        .first()) ?? { ...DEFAULT_SETTINGS, teacherUserId };

    const dayOfWeek = jsToIsoWeekday(new Date(`${date}T00:00:00`).getDay());
    if (!settings.workDays.includes(dayOfWeek)) return [];

    const allSlots = generateSlots(date, settings);
    const now = Date.now();
    const dateStart = new Date(`${date}T00:00:00`).getTime();
    const dateEnd = dateStart + 86_400_000;

    const existingBookings = await ctx.db
      .query("teacherBookings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", teacherUserId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), dateStart),
          q.lt(q.field("startTime"), dateEnd),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "reschedule_proposed"),
          ),
        ),
      )
      .collect();

    return allSlots
      .filter((slot) => slot.startTime > now)
      .filter((slot) => !existingBookings.some((b) => b.startTime < slot.endTime && b.endTime > slot.startTime));
  },
});

/**
 * My outgoing booking requests (what I sent to someone else).
 * - student/parent: bookings where studentUserId == me
 * - teacher: bookings where teacherUserId == me AND I initiated
 */
export const listMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    let rawBookings: any[];

    if (user.role === "teacher") {
      rawBookings = await ctx.db
        .query("teacherBookings")
        .withIndex("by_teacher", (q) => q.eq("teacherUserId", user._id))
        .filter((q) => q.eq(q.field("initiatedBy"), "teacher"))
        .order("desc")
        .collect();
    } else {
      // student or parent — always in studentUserId
      rawBookings = await ctx.db
        .query("teacherBookings")
        .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
        .filter((q) =>
          // exclude teacher-initiated ones (those are "incoming" for them)
          q.neq(q.field("initiatedBy"), "teacher"),
        )
        .order("desc")
        .collect();
    }

    return Promise.all(
      rawBookings.map(async (b) => {
        const teacher = await ctx.db.get(b.teacherUserId);
        const otherParty = await ctx.db.get(
          user._id === b.teacherUserId ? b.studentUserId : b.teacherUserId,
        );
        return { ...b, teacher, otherParty };
      }),
    );
  },
});

/**
 * Incoming booking requests I need to respond to.
 * - teacher: bookings where teacherUserId == me AND initiatedBy != "teacher"
 * - student/parent: bookings where studentUserId == me AND initiatedBy == "teacher"
 */
export const listIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    let rawBookings: any[];

    if (user.role === "teacher" || user.role === "admin") {
      rawBookings = await ctx.db
        .query("teacherBookings")
        .withIndex("by_teacher", (q) => q.eq("teacherUserId", user._id))
        .filter((q) => q.neq(q.field("initiatedBy"), "teacher"))
        .order("desc")
        .collect();
    } else if (user.role === "student" || user.role === "parent") {
      rawBookings = await ctx.db
        .query("teacherBookings")
        .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
        .filter((q) => q.eq(q.field("initiatedBy"), "teacher"))
        .order("desc")
        .collect();
    } else {
      return [];
    }

    return Promise.all(
      rawBookings.map(async (b) => {
        const teacher = await ctx.db.get(b.teacherUserId);
        const student = await ctx.db.get(b.studentUserId);
        return { ...b, teacher, student };
      }),
    );
  },
});

/** Detail view for any participant. */
export const getById = query({
  args: { bookingId: v.id("teacherBookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;
    if (booking.studentUserId !== user._id && booking.teacherUserId !== user._id && user.role !== "admin") {
      throw new Error("Access denied.");
    }
    const teacher = await ctx.db.get(booking.teacherUserId);
    const student = await ctx.db.get(booking.studentUserId);
    return { ...booking, teacher, student };
  },
});

// ─── teacher availability settings ─────────────────────────────────────────

export const upsertAvailabilitySettings = mutation({
  args: {
    slotDurationMinutes: v.number(),
    workDayStart: v.string(),
    workDayEnd: v.string(),
    workDays: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") throw new Error("Only teachers can update availability settings.");
    if (args.slotDurationMinutes !== 30 && args.slotDurationMinutes !== 60) throw new Error("Slot duration must be 30 or 60 minutes.");
    if (toMinutes(args.workDayStart) >= toMinutes(args.workDayEnd)) throw new Error("Work day end must be after start.");

    const existing = await ctx.db
      .query("teacherAvailabilitySettings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("teacherAvailabilitySettings", { teacherUserId: user._id, ...args, updatedAt: Date.now() });
    }
  },
});

// ─── booking lifecycle mutations ─────────────────────────────────────────────

/**
 * Create a booking request.
 *
 * - student/parent → provide `teacherUserId` (target teacher)
 * - teacher        → provide `targetUserId` (target student or parent)
 *
 * Availability is always checked against the teacher's schedule.
 */
export const createBooking = mutation({
  args: {
    teacherUserId: v.optional(v.id("users")),  // student/parent provides this
    targetUserId: v.optional(v.id("users")),   // teacher provides this
    startTime: v.number(),
    endTime: v.number(),
    meetingType: v.union(v.literal("in_person"), v.literal("online")),
    studentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.startTime <= Date.now()) throw new Error("Cannot book a slot in the past.");
    if (args.endTime <= args.startTime) throw new Error("End time must be after start time.");

    let teacherUserId: Id<"users">;
    let otherPartyId: Id<"users">;
    const initiatedBy = user.role as "student" | "teacher" | "parent";

    if (user.role === "teacher") {
      // Teacher initiates: they are the teacher, target is student/parent
      if (!args.targetUserId) throw new Error("targetUserId is required for teacher-initiated bookings.");
      const target = await ctx.db.get(args.targetUserId);
      if (!target) throw new Error("Target user not found.");
      if (target.role !== "student" && target.role !== "parent") throw new Error("Teacher can only book with students or parents.");
      teacherUserId = user._id;
      otherPartyId = args.targetUserId;
    } else if (user.role === "student" || user.role === "parent") {
      // Student/parent initiates: they book with a teacher
      if (!args.teacherUserId) throw new Error("teacherUserId is required.");
      const teacher = await ctx.db.get(args.teacherUserId);
      if (!teacher || teacher.role !== "teacher") throw new Error("Invalid teacher.");
      teacherUserId = args.teacherUserId;
      otherPartyId = user._id;
    } else {
      throw new Error("Your role is not permitted to create bookings.");
    }

    // Validate slot against teacher's availability
    const settings =
      (await ctx.db
        .query("teacherAvailabilitySettings")
        .withIndex("by_teacher", (q) => q.eq("teacherUserId", teacherUserId))
        .first()) ?? { ...DEFAULT_SETTINGS, teacherUserId };

    const dateStr = new Date(args.startTime).toISOString().slice(0, 10);
    const validSlots = generateSlots(dateStr, settings);
    if (!validSlots.some((s) => s.startTime === args.startTime && s.endTime === args.endTime)) {
      throw new Error("The requested time does not match a valid slot.");
    }
    const dayOfWeek = jsToIsoWeekday(new Date(args.startTime).getDay());
    if (!settings.workDays.includes(dayOfWeek)) throw new Error("Teacher is not available on this day.");

    // Double-booking guard
    const conflict = await ctx.db
      .query("teacherBookings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", teacherUserId))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "reschedule_proposed"),
          ),
          q.lt(q.field("startTime"), args.endTime),
          q.gt(q.field("endTime"), args.startTime),
        ),
      )
      .first();
    if (conflict) throw new Error("This time slot is no longer available.");

    const durationMinutes = Math.round((args.endTime - args.startTime) / 60_000);
    const meetingLink = args.meetingType === "online" ? generateMeetingLink() : undefined;

    // studentUserId = student/parent party; teacherUserId = teacher party (always)
    const studentUserId = user.role === "teacher" ? otherPartyId : user._id;
    const bookingId = await ctx.db.insert("teacherBookings", {
      studentUserId,
      teacherUserId,
      startTime: args.startTime,
      endTime: args.endTime,
      durationMinutes,
      meetingType: args.meetingType,
      meetingLink,
      status: "pending",
      initiatedBy,
      studentNotes: args.studentNotes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const dateLabel = new Date(args.startTime).toLocaleString();
    const respondentId = user.role === "teacher" ? otherPartyId : teacherUserId;
    const respondent = await ctx.db.get(respondentId);
    await notify(ctx, respondentId, "New Meeting Request",
      `${user.fullName ?? user.email} has requested a ${args.meetingType === "online" ? "virtual" : "in-person"} meeting on ${dateLabel}.`,
    );
    await notify(ctx, user._id, "Meeting Request Sent",
      `Your request to ${respondent?.fullName ?? respondent?.email} for ${dateLabel} is pending confirmation.`,
    );

    return bookingId;
  },
});

/**
 * Accept a pending booking.
 * The respondent (teacher for student/parent-initiated; student/parent for teacher-initiated) accepts.
 */
export const acceptBooking = mutation({
  args: { bookingId: v.id("teacherBookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const respondentId = getRespondentId(booking);
    if (respondentId !== user._id && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status !== "pending" && booking.status !== "reschedule_proposed") {
      throw new Error(`Cannot accept a booking with status "${booking.status}".`);
    }

    // Final conflict check
    const conflict = await ctx.db
      .query("teacherBookings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", booking.teacherUserId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), bookingId),
          q.eq(q.field("status"), "accepted"),
          q.lt(q.field("startTime"), booking.endTime),
          q.gt(q.field("endTime"), booking.startTime),
        ),
      )
      .first();
    if (conflict) throw new Error("Another booking already occupies this slot.");

    await ctx.db.patch(bookingId, { status: "accepted", updatedAt: Date.now() });

    const initiatorId = getInitiatorId(booking);
    const initiator = await ctx.db.get(initiatorId);
    const dateLabel = new Date(booking.startTime).toLocaleString();
    await notify(ctx, initiatorId, "Meeting Confirmed",
      `Your meeting with ${user.fullName ?? user.email} on ${dateLabel} has been confirmed.`,
    );
    await notify(ctx, user._id, "Meeting Confirmed",
      `You confirmed the meeting with ${initiator?.fullName ?? initiator?.email} on ${dateLabel}.`,
    );
  },
});

/** Reject/decline a pending booking (respondent only). */
export const rejectBooking = mutation({
  args: { bookingId: v.id("teacherBookings"), reason: v.optional(v.string()) },
  handler: async (ctx, { bookingId, reason }) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const respondentId = getRespondentId(booking);
    if (respondentId !== user._id && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status !== "pending" && booking.status !== "reschedule_proposed") {
      throw new Error(`Cannot reject a booking with status "${booking.status}".`);
    }

    await ctx.db.patch(bookingId, { status: "rejected", rejectionReason: reason, updatedAt: Date.now() });

    const initiatorId = getInitiatorId(booking);
    const dateLabel = new Date(booking.startTime).toLocaleString();
    await notify(ctx, initiatorId, "Meeting Declined",
      `Your meeting request for ${dateLabel} was declined.${reason ? ` Reason: ${reason}` : ""}`,
    );
  },
});

/** Propose a new time (respondent only — usually teacher). */
export const proposeNewTime = mutation({
  args: {
    bookingId: v.id("teacherBookings"),
    proposedStartTime: v.number(),
    proposedEndTime: v.number(),
    rescheduleNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");

    const respondentId = getRespondentId(booking);
    if (respondentId !== user._id && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status !== "pending") throw new Error("Can only propose a new time for pending bookings.");
    if (args.proposedStartTime <= Date.now()) throw new Error("Proposed time cannot be in the past.");
    if (args.proposedEndTime <= args.proposedStartTime) throw new Error("Proposed end must be after start.");

    // Validate proposed slot against teacher's availability
    const settings =
      (await ctx.db
        .query("teacherAvailabilitySettings")
        .withIndex("by_teacher", (q) => q.eq("teacherUserId", booking.teacherUserId))
        .first()) ?? DEFAULT_SETTINGS;
    const proposedDate = new Date(args.proposedStartTime).toISOString().slice(0, 10);
    const validSlots = generateSlots(proposedDate, settings);
    if (!validSlots.some((s) => s.startTime === args.proposedStartTime && s.endTime === args.proposedEndTime)) {
      throw new Error("Proposed time is not a valid slot.");
    }

    const conflict = await ctx.db
      .query("teacherBookings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", booking.teacherUserId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.bookingId),
          q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "accepted")),
          q.lt(q.field("startTime"), args.proposedEndTime),
          q.gt(q.field("endTime"), args.proposedStartTime),
        ),
      )
      .first();
    if (conflict) throw new Error("The proposed slot is already taken.");

    await ctx.db.patch(args.bookingId, {
      status: "reschedule_proposed",
      proposedStartTime: args.proposedStartTime,
      proposedEndTime: args.proposedEndTime,
      rescheduleNote: args.rescheduleNote,
      updatedAt: Date.now(),
    });

    const initiatorId = getInitiatorId(booking);
    const original = new Date(booking.startTime).toLocaleString();
    const proposed = new Date(args.proposedStartTime).toLocaleString();
    await notify(ctx, initiatorId, "Reschedule Proposed",
      `Your meeting (originally ${original}) has been rescheduled to ${proposed}. Please accept or decline.`,
    );
  },
});

/** Initiator accepts the respondent's proposed new time. */
export const acceptReschedule = mutation({
  args: { bookingId: v.id("teacherBookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const initiatorId = getInitiatorId(booking);
    if (initiatorId !== user._id && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status !== "reschedule_proposed") throw new Error("No pending reschedule to accept.");
    if (!booking.proposedStartTime || !booking.proposedEndTime) throw new Error("No proposed time found.");

    await ctx.db.patch(bookingId, {
      startTime: booking.proposedStartTime,
      endTime: booking.proposedEndTime,
      proposedStartTime: undefined,
      proposedEndTime: undefined,
      status: "accepted",
      updatedAt: Date.now(),
    });

    const respondentId = getRespondentId(booking);
    const dateLabel = new Date(booking.proposedStartTime).toLocaleString();
    await notify(ctx, respondentId, "Reschedule Accepted",
      `${user.fullName ?? user.email} accepted the rescheduled meeting on ${dateLabel}.`,
    );
    await notify(ctx, user._id, "Meeting Confirmed", `Your rescheduled meeting is confirmed for ${dateLabel}.`);
  },
});

/** Initiator declines the respondent's proposed new time. */
export const declineReschedule = mutation({
  args: { bookingId: v.id("teacherBookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const initiatorId = getInitiatorId(booking);
    if (initiatorId !== user._id && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status !== "reschedule_proposed") throw new Error("No pending reschedule to decline.");

    await ctx.db.patch(bookingId, {
      status: "cancelled",
      proposedStartTime: undefined,
      proposedEndTime: undefined,
      updatedAt: Date.now(),
    });

    const respondentId = getRespondentId(booking);
    await notify(ctx, respondentId, "Reschedule Declined",
      `${user.fullName ?? user.email} declined the proposed new time. The booking has been cancelled.`,
    );
    await notify(ctx, user._id, "Booking Cancelled", "You declined the proposed reschedule. The booking has been cancelled.");
  },
});

/** Cancel a booking (either participant). */
export const cancelBooking = mutation({
  args: { bookingId: v.id("teacherBookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await getCurrentUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const isParticipant = booking.studentUserId === user._id || booking.teacherUserId === user._id;
    if (!isParticipant && user.role !== "admin") throw new Error("Access denied.");
    if (booking.status === "completed" || booking.status === "cancelled") {
      throw new Error(`Booking is already ${booking.status}.`);
    }

    await ctx.db.patch(bookingId, { status: "cancelled", updatedAt: Date.now() });

    const otherPartyId = user._id === booking.studentUserId ? booking.teacherUserId : booking.studentUserId;
    const dateLabel = new Date(booking.startTime).toLocaleString();
    await notify(ctx, otherPartyId, "Booking Cancelled",
      `The meeting on ${dateLabel} was cancelled by ${user.fullName ?? user.email}.`,
    );
  },
});
