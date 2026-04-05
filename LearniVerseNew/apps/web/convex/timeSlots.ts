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
    const slots = await ctx.db.query("timeSlots").collect();

    return await Promise.all(
      slots.map(async (slot) => ({
        ...slot,
        room: await ctx.db.get(slot.roomId),
      })),
    );
  },
});

export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    slotName: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "admin") {
      throw new Error("Only admins can create time slots.");
    }

    return await ctx.db.insert("timeSlots", {
      roomId: args.roomId,
      slotName: args.slotName,
      startTime: args.startTime,
      endTime: args.endTime,
      isActive: true,
    });
  },
});
