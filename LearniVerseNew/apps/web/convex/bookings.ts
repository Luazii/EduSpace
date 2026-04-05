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

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    return await Promise.all(
      bookings
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (booking) => ({
          ...booking,
          room: await ctx.db.get(booking.roomId),
          timeSlot: await ctx.db.get(booking.timeSlotId),
        })),
    );
  },
});

export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    timeSlotId: v.id("timeSlots"),
    bookingDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db.insert("bookings", {
      studentUserId: user._id,
      roomId: args.roomId,
      timeSlotId: args.timeSlotId,
      bookingDate: args.bookingDate,
      status: "active",
      createdAt: Date.now(),
    });
  },
});
