import { v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to perform this action.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) {
    throw new Error("No application user record exists for this session.");
  }

  return user;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rooms").collect();
  },
});

export const create = mutation({
  args: {
    roomCode: v.string(),
    campus: v.string(),
    name: v.string(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "admin") {
      throw new Error("Only admins can create rooms.");
    }

    return await ctx.db.insert("rooms", {
      roomCode: args.roomCode,
      campus: args.campus,
      name: args.name,
      capacity: args.capacity,
      isActive: true,
    });
  },
});
