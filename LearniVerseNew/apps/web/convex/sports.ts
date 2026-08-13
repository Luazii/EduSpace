import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

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

// ── Admin: manage sports ──────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const sports = await ctx.db.query("sports").collect();
    const counts = await Promise.all(
      sports.map(async (s) => {
        const regs = await ctx.db
          .query("sportRegistrations")
          .withIndex("by_sport", (q) => q.eq("sportId", s._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
        return { ...s, enrolledCount: regs.length };
      }),
    );
    return counts.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    coachName: v.optional(v.string()),
    venue: v.optional(v.string()),
    schedule: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Only admins can create sports.");
    const now = Date.now();
    return ctx.db.insert("sports", { ...args, isActive: true, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    sportId: v.id("sports"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    coachName: v.optional(v.string()),
    venue: v.optional(v.string()),
    schedule: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Only admins can update sports.");
    const { sportId, ...fields } = args;
    const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(sportId, { ...patch, updatedAt: Date.now() });
  },
});

// ── Student: view + register ──────────────────────────────────────────────────

export const listForStudent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const sports = await ctx.db.query("sports").filter((q) => q.eq(q.field("isActive"), true)).collect();
    const myRegs = await ctx.db
      .query("sportRegistrations")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    return await Promise.all(
      sports.map(async (s) => {
        const allRegs = await ctx.db
          .query("sportRegistrations")
          .withIndex("by_sport", (q) => q.eq("sportId", s._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
        const myReg = myRegs.find((r) => r.sportId === s._id && r.status === "active");
        return {
          ...s,
          enrolledCount: allRegs.length,
          isRegistered: !!myReg,
          registrationId: myReg?._id ?? null,
          isFull: s.maxCapacity != null && allRegs.length >= s.maxCapacity,
        };
      }),
    ).then((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
  },
});

export const register = mutation({
  args: { sportId: v.id("sports") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student") throw new Error("Only students can register for sports.");

    const sport = await ctx.db.get(args.sportId);
    if (!sport || !sport.isActive) throw new Error("Sport not found or inactive.");

    const existing = await ctx.db
      .query("sportRegistrations")
      .withIndex("by_sport_and_student", (q) =>
        q.eq("sportId", args.sportId).eq("studentUserId", user._id),
      )
      .first();
    if (existing?.status === "active") throw new Error("Already registered.");

    if (sport.maxCapacity != null) {
      const count = (
        await ctx.db
          .query("sportRegistrations")
          .withIndex("by_sport", (q) => q.eq("sportId", args.sportId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
      ).length;
      if (count >= sport.maxCapacity) throw new Error("Sport is at capacity.");
    }

    if (existing) {
      await ctx.db.patch(existing._id, { status: "active", registeredAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("sportRegistrations", {
      sportId: args.sportId,
      studentUserId: user._id,
      registeredAt: Date.now(),
      status: "active",
    });
  },
});

export const withdraw = mutation({
  args: { registrationId: v.id("sportRegistrations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const reg = await ctx.db.get(args.registrationId);
    if (!reg || reg.studentUserId !== user._id) throw new Error("Registration not found.");
    await ctx.db.patch(args.registrationId, { status: "withdrawn" });
  },
});

export const markAttendanceByQR = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    learnerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "coach" && user.role !== "admin") {
      throw new Error("Only coaches and admins can record attendance.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found.");

    // Check if the learner is actually on the team
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_student", (q) => 
        q.eq("teamId", session.teamId).eq("studentUserId", args.learnerUserId)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("This student is not active on this sports team.");
    }

    const learner = await ctx.db.get(args.learnerUserId);

    // Check if already marked
    const existing = await ctx.db
      .query("sportsAttendance")
      .withIndex("by_session_and_student", (q) => 
        q.eq("sessionId", args.sessionId).eq("studentUserId", args.learnerUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "present",
        markedByUserId: user._id,
        markedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("sportsAttendance", {
        sessionId: args.sessionId,
        studentUserId: args.learnerUserId,
        status: "present",
        markedByUserId: user._id,
        markedAt: Date.now(),
      });
    }

    return learner;
  },
});

// ── Student: Training Schedule & Fixtures ─────────────────────────────────────

export const listStudentTrainingSchedule = query({
  args: {
    studentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let targetUserId: Id<"users">;
    if (args.studentUserId) {
      targetUserId = args.studentUserId;
    } else {
      const user = await getCurrentUser(ctx);
      targetUserId = user._id;
    }

    // 1. Direct team memberships
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_student", (q) => q.eq("studentUserId", targetUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const teamIds = new Set<Id<"sportsTeams">>(memberships.map((m) => m.teamId));

    // 2. Registrations for sports
    const registrations = await ctx.db
      .query("sportRegistrations")
      .withIndex("by_student", (q) => q.eq("studentUserId", targetUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const reg of registrations) {
      const teamsForSport = await ctx.db
        .query("sportsTeams")
        .withIndex("by_sport", (q) => q.eq("sportId", reg.sportId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      for (const t of teamsForSport) {
        teamIds.add(t._id);
      }
    }

    const teamList = Array.from(teamIds);
    const sessionsList: any[] = [];
    const fixturesList: any[] = [];
    const myTeams: any[] = [];

    for (const teamId of teamList) {
      const team = await ctx.db.get(teamId);
      if (!team) continue;
      const sport = await ctx.db.get(team.sportId);
      const coach = team.coachUserId ? await ctx.db.get(team.coachUserId) : null;

      myTeams.push({
        ...team,
        sportName: sport?.name ?? "Sport",
        coachName: coach?.fullName ?? coach?.email ?? sport?.coachName ?? "Team Coach",
      });

      // Training sessions
      const sessions = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const s of sessions) {
        const attendance = await ctx.db
          .query("sportsAttendance")
          .withIndex("by_session_and_student", (q) =>
            q.eq("sessionId", s._id).eq("studentUserId", targetUserId),
          )
          .first();

        let venueName = s.venue;
        if (s.venueId) {
          const venueDoc = await ctx.db.get(s.venueId);
          if (venueDoc) venueName = venueDoc.name;
        }

        sessionsList.push({
          ...s,
          venueName: venueName || "Sports Grounds",
          teamName: team.name,
          sportName: sport?.name ?? "Sport",
          sportCategory: sport?.category,
          coachName: coach?.fullName ?? coach?.email ?? sport?.coachName ?? "Team Coach",
          attendanceStatus: attendance?.status ?? null,
          attendanceMarkedAt: attendance?.markedAt ?? null,
        });
      }

      // Match fixtures
      const fixtures = await ctx.db
        .query("matchFixtures")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const f of fixtures) {
        let venueName = f.venue;
        if (f.venueId) {
          const venueDoc = await ctx.db.get(f.venueId);
          if (venueDoc) venueName = venueDoc.name;
        }

        fixturesList.push({
          ...f,
          venueName: venueName || "Sports Grounds",
          teamName: team.name,
          sportName: sport?.name ?? "Sport",
          sportCategory: sport?.category,
        });
      }
    }

    const now = Date.now();
    const upcomingSessions = sessionsList
      .filter((s) => s.status !== "cancelled" && s.endTime >= now - 2 * 60 * 60 * 1000)
      .sort((a, b) => a.startTime - b.startTime);

    const pastSessions = sessionsList
      .filter((s) => s.endTime < now - 2 * 60 * 60 * 1000 || s.status === "completed")
      .sort((a, b) => b.startTime - a.startTime);

    const upcomingFixtures = fixturesList
      .filter((f) => f.status !== "cancelled" && f.matchTime >= now - 2 * 60 * 60 * 1000)
      .sort((a, b) => a.matchTime - b.matchTime);

    const totalSessions = pastSessions.length;
    const attendedCount = pastSessions.filter(
      (s) => s.attendanceStatus === "present" || s.attendanceStatus === "late",
    ).length;
    const attendancePercentage = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : null;

    return {
      upcomingSessions,
      pastSessions,
      upcomingFixtures,
      myTeams,
      attendancePercentage,
      totalSessions,
      attendedCount,
    };
  },
});
