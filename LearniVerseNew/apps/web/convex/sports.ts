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
