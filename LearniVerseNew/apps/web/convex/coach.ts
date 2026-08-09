import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

async function requireCoach(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "coach" && user.role !== "admin") {
    throw new Error("Unauthorized: Coach access required.");
  }
  return user;
}

// Two events overlap iff each starts before the other ends.
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

async function notifyTeam(ctx: MutationCtx, teamId: Id<"sportsTeams">, title: string, body: string) {
  const members = await ctx.db
    .query("teamMemberships")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();
  const now = Date.now();
  await Promise.all(
    members.map((m) =>
      ctx.db.insert("notifications", {
        userId: m.studentUserId,
        title,
        body,
        type: "sports",
        isRead: false,
        createdAt: now,
      }),
    ),
  );
}

// ── Teams & Memberships ──────────────────────────────────────────────────────────

export const listMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCoach(ctx);
    // If admin, they might see all teams, but let's restrict to teams where they are the coach for now,
    // or return all teams if they are an admin.
    let teams;
    if (user.role === "admin") {
      teams = await ctx.db.query("sportsTeams").collect();
    } else {
      teams = await ctx.db
        .query("sportsTeams")
        .filter((q) => q.eq(q.field("coachUserId"), user._id))
        .collect();
    }

    // Enrich with sport name and member count
    return Promise.all(
      teams.map(async (t) => {
        const sport = await ctx.db.get(t.sportId);
        const memberships = await ctx.db
          .query("teamMemberships")
          .withIndex("by_team", (q) => q.eq("teamId", t._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
        return {
          ...t,
          sportName: sport?.name ?? "Unknown Sport",
          memberCount: memberships.length,
        };
      })
    );
  },
});

export const listEligibleLearners = query({
  args: { teamId: v.id("sportsTeams") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    // All active registrations for this sport
    const registrations = await ctx.db
      .query("sportRegistrations")
      .withIndex("by_sport", (q) => q.eq("sportId", team.sportId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Current active team members
    const activeMembers = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const activeMemberIds = new Set(activeMembers.map((m) => m.studentUserId));

    // Filter out already active members
    const eligibleRegs = registrations.filter((r) => !activeMemberIds.has(r.studentUserId));

    // Resolve user details
    return Promise.all(
      eligibleRegs.map(async (r) => {
        const student = await ctx.db.get(r.studentUserId);
        return {
          studentUserId: r.studentUserId,
          firstName: student?.firstName ?? "",
          lastName: student?.lastName ?? "",
          email: student?.email ?? "",
        };
      })
    );
  },
});

export const assignToTeam = mutation({
  args: { teamId: v.id("sportsTeams"), studentUserId: v.id("users"), role: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    
    // Check if already in team
    const existing = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_student", (q) => 
        q.eq("teamId", args.teamId).eq("studentUserId", args.studentUserId)
      )
      .first();

    if (existing) {
      if (existing.status === "active") throw new Error("Student is already active in this team.");
      await ctx.db.patch(existing._id, { status: "active", joinedAt: Date.now(), role: args.role });
      return existing._id;
    }

    return ctx.db.insert("teamMemberships", {
      teamId: args.teamId,
      studentUserId: args.studentUserId,
      role: args.role,
      status: "active",
      joinedAt: Date.now(),
    });
  },
});

export const removeMembership = mutation({
  args: { membershipId: v.id("teamMemberships") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    await ctx.db.patch(args.membershipId, { status: "inactive" });
  },
});

export const getTeamRoster = query({
  args: { teamId: v.id("sportsTeams") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return Promise.all(
      memberships.map(async (m) => {
        const student = await ctx.db.get(m.studentUserId);
        return {
          ...m,
          studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
        };
      })
    );
  },
});

// ── Training Sessions & Attendance ──────────────────────────────────────────────

export const listTrainingSessions = query({
  args: { teamId: v.id("sportsTeams") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    
    return sessions.sort((a, b) => b.startTime - a.startTime); // newest first
  },
});

export const createTrainingSession = mutation({
  args: {
    teamId: v.id("sportsTeams"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    venue: v.optional(v.string()),
    venueId: v.optional(v.id("sportsVenues")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCoach(ctx);

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time.");
    }

    // Conflict: the team already has a scheduled session at an overlapping time.
    const teamSessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    if (teamSessions.some((s) => overlaps(args.startTime, args.endTime, s.startTime, s.endTime))) {
      throw new Error("This team already has a training session scheduled at an overlapping time.");
    }

    // Conflict: the venue (if a real registered venue was picked) is already booked.
    if (args.venueId) {
      const venueBookings = await ctx.db
        .query("sportsVenueBookings")
        .withIndex("by_venue", (q) => q.eq("venueId", args.venueId!))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      if (venueBookings.some((b) => overlaps(args.startTime, args.endTime, b.startTime, b.endTime))) {
        throw new Error("The selected venue is already booked for this time slot.");
      }
    }

    const sessionId = await ctx.db.insert("trainingSessions", {
      ...args,
      status: "scheduled",
      createdByUserId: user._id,
      createdAt: Date.now(),
    });

    await notifyTeam(
      ctx,
      args.teamId,
      "New training session scheduled",
      `${args.title} — ${new Date(args.startTime).toLocaleString()}${args.venue ? ` at ${args.venue}` : ""}.`,
    );

    return sessionId;
  },
});

export const getAttendanceForSession = query({
  args: { sessionId: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    return ctx.db
      .query("sportsAttendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const markAttendance = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    studentUserId: v.id("users"),
    status: v.union(v.literal("present"), v.literal("absent"), v.literal("late"), v.literal("excused")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCoach(ctx);
    const existing = await ctx.db
      .query("sportsAttendance")
      .withIndex("by_session_and_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentUserId", args.studentUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        notes: args.notes,
        markedByUserId: user._id,
        markedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("sportsAttendance", {
      sessionId: args.sessionId,
      studentUserId: args.studentUserId,
      status: args.status,
      notes: args.notes,
      markedByUserId: user._id,
      markedAt: Date.now(),
    });
  },
});

// Grace period after a session's start time before a scan counts as "late".
const LATE_GRACE_MS = 10 * 60 * 1000; // 10 minutes

export const markAttendanceByScanCode = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    scanCode: v.string(),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoach(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Training session not found.");

    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_scan_code", (q) => q.eq("scanCode", args.scanCode))
      .first();
    if (!profile) throw new Error("Unrecognized code — this student doesn't have a registered scan code.");

    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_student", (q) => q.eq("teamId", session.teamId).eq("studentUserId", profile.userId))
      .first();
    if (!membership || membership.status !== "active") {
      throw new Error("This student is not on the roster for this session's team.");
    }

    const scannedAt = Date.now();
    // Computed, not manually chosen: on-time if scanned within the grace
    // window of the session's actual start time, late otherwise.
    const status: "present" | "late" = scannedAt <= session.startTime + LATE_GRACE_MS ? "present" : "late";

    const existing = await ctx.db
      .query("sportsAttendance")
      .withIndex("by_session_and_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentUserId", profile.userId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status, markedByUserId: coach._id, markedAt: scannedAt });
    } else {
      await ctx.db.insert("sportsAttendance", {
        sessionId: args.sessionId,
        studentUserId: profile.userId,
        status,
        markedByUserId: coach._id,
        markedAt: scannedAt,
      });
    }

    const student = await ctx.db.get(profile.userId);
    return {
      studentUserId: profile.userId,
      fullName: student?.fullName ?? student?.email ?? "Student",
      status,
    };
  },
});

// ── Match Fixtures & Results ────────────────────────────────────────────────────

export const listFixtures = query({
  args: { teamId: v.id("sportsTeams") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const fixtures = await ctx.db
      .query("matchFixtures")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    
    return Promise.all(
      fixtures.map(async (f) => {
        const result = await ctx.db
          .query("matchResults")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", f._id))
          .first();
        return { ...f, result };
      })
    ).then(list => list.sort((a, b) => b.matchTime - a.matchTime));
  },
});

const FIXTURE_DURATION_MS = 2 * 60 * 60 * 1000; // matches assumed to occupy ~2h for conflict purposes

export const createFixture = mutation({
  args: {
    teamId: v.id("sportsTeams"),
    opponentName: v.string(),
    venue: v.string(),
    venueId: v.optional(v.id("sportsVenues")),
    isHomeFixture: v.boolean(),
    matchTime: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCoach(ctx);
    const matchEnd = args.matchTime + FIXTURE_DURATION_MS;

    // Conflict: the team already has a fixture around this time.
    const teamFixtures = await ctx.db
      .query("matchFixtures")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    if (teamFixtures.some((f) => overlaps(args.matchTime, matchEnd, f.matchTime, f.matchTime + FIXTURE_DURATION_MS))) {
      throw new Error("This team already has a fixture scheduled around this time.");
    }

    // Conflict: the venue (if a real registered venue was picked) is already booked.
    if (args.venueId) {
      const venueBookings = await ctx.db
        .query("sportsVenueBookings")
        .withIndex("by_venue", (q) => q.eq("venueId", args.venueId!))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      if (venueBookings.some((b) => overlaps(args.matchTime, matchEnd, b.startTime, b.endTime))) {
        throw new Error("The selected venue is already booked around this time.");
      }
    }

    const fixtureId = await ctx.db.insert("matchFixtures", {
      ...args,
      status: "scheduled",
      createdByUserId: user._id,
      createdAt: Date.now(),
    });

    await notifyTeam(
      ctx,
      args.teamId,
      "New fixture scheduled",
      `vs ${args.opponentName} — ${new Date(args.matchTime).toLocaleString()} at ${args.venue} (${args.isHomeFixture ? "Home" : "Away"}).`,
    );

    return fixtureId;
  },
});

export const recordResult = mutation({
  args: {
    fixtureId: v.id("matchFixtures"),
    ourScore: v.number(),
    opponentScore: v.number(),
    matchReport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCoach(ctx);
    const resultType = args.ourScore > args.opponentScore ? "win" : args.ourScore < args.opponentScore ? "loss" : "draw";
    
    await ctx.db.patch(args.fixtureId, { status: "completed" });
    
    const existing = await ctx.db
      .query("matchResults")
      .withIndex("by_fixture", (q) => q.eq("fixtureId", args.fixtureId))
      .first();
      
    if (existing) {
      await ctx.db.patch(existing._id, {
        ourScore: args.ourScore,
        opponentScore: args.opponentScore,
        result: resultType,
        matchReport: args.matchReport,
        recordedByUserId: user._id,
        recordedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("matchResults", {
      fixtureId: args.fixtureId,
      ourScore: args.ourScore,
      opponentScore: args.opponentScore,
      result: resultType,
      matchReport: args.matchReport,
      recordedByUserId: user._id,
      recordedAt: Date.now(),
    });
  },
});

// League-table points: 3 for a win, 1 for a draw, 0 for a loss.
export const getTeamStandings = query({
  args: { teamId: v.id("sportsTeams") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const fixtures = await ctx.db
      .query("matchFixtures")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const results = await Promise.all(
      fixtures.map((f) =>
        ctx.db
          .query("matchResults")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", f._id))
          .first(),
      ),
    );

    const tally = { played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    for (const r of results) {
      if (!r) continue;
      tally.played++;
      tally.goalsFor += r.ourScore;
      tally.goalsAgainst += r.opponentScore;
      if (r.result === "win") { tally.wins++; tally.points += 3; }
      else if (r.result === "draw") { tally.draws++; tally.points += 1; }
      else tally.losses++;
    }

    return { ...tally, goalDifference: tally.goalsFor - tally.goalsAgainst };
  },
});

// ── Performance Reports ─────────────────────────────────────────────────────────

// Attendance rate + evaluation trend for one athlete on one team — used to
// inform the evaluation form with real computed data instead of a bare
// freeform field. Also derives sportId from the team server-side, so an
// evaluation can never be filed against the wrong sport.
export const getAthleteStats = query({
  args: { teamId: v.id("sportsTeams"), studentUserId: v.id("users") },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const attendanceRows = await Promise.all(
      sessions.map((s) =>
        ctx.db
          .query("sportsAttendance")
          .withIndex("by_session_and_student", (q) => q.eq("sessionId", s._id).eq("studentUserId", args.studentUserId))
          .first(),
      ),
    );
    const attended = attendanceRows.filter((a) => a && (a.status === "present" || a.status === "late")).length;
    const attendanceRate = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : null;

    const team = await ctx.db.get(args.teamId);
    const priorReports = team
      ? await ctx.db
          .query("sportsReports")
          .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
          .filter((q) => q.eq(q.field("sportId"), team.sportId))
          .collect()
      : [];
    const scored = priorReports.filter((r) => r.performanceScore != null);
    const avgPastScore = scored.length > 0
      ? Math.round((scored.reduce((sum, r) => sum + (r.performanceScore ?? 0), 0) / scored.length) * 10) / 10
      : null;

    return {
      sessionsScheduled: sessions.length,
      sessionsAttended: attended,
      attendanceRate,
      priorEvaluationCount: priorReports.length,
      avgPastScore,
    };
  },
});

export const createReport = mutation({
  args: {
    studentUserId: v.id("users"),
    teamId: v.id("sportsTeams"),
    performanceScore: v.optional(v.number()),
    comments: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCoach(ctx);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found.");
    return ctx.db.insert("sportsReports", {
      studentUserId: args.studentUserId,
      sportId: team.sportId, // resolved server-side — never trust a client-picked sportId
      performanceScore: args.performanceScore,
      comments: args.comments,
      coachUserId: user._id,
      evaluationDate: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const listReports = query({
  args: { studentUserId: v.id("users"), sportId: v.optional(v.id("sports")) },
  handler: async (ctx, args) => {
    await requireCoach(ctx);
    let q = ctx.db
      .query("sportsReports")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId));
      
    const reports = await q.collect();
    
    const filtered = args.sportId 
      ? reports.filter(r => r.sportId === args.sportId)
      : reports;
      
    return Promise.all(
      filtered.map(async (r) => {
        const sport = await ctx.db.get(r.sportId);
        return {
          ...r,
          sportName: sport?.name ?? "Unknown",
        };
      })
    ).then(list => list.sort((a, b) => b.evaluationDate - a.evaluationDate));
  },
});
