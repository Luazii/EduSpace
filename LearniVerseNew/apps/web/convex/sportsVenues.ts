import { v } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";

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

export const listVenues = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin" && user.role !== "coach") {
      throw new Error("Unauthorized");
    }
    const venues = await ctx.db.query("sportsVenues").collect();
    if (args.includeInactive) return venues;
    return venues.filter(v => v.isActive);
  },
});

export const createVenue = mutation({
  args: {
    name: v.string(),
    location: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.insert("sportsVenues", {
      name: args.name,
      location: args.location,
      capacity: args.capacity,
      isActive: true,
    });
  },
});

export const listBookings = query({
  args: { venueId: v.optional(v.id("sportsVenues")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin" && user.role !== "coach") {
      throw new Error("Unauthorized");
    }
    let bookings = [];
    if (args.venueId) {
      bookings = await ctx.db
        .query("sportsVenueBookings")
        .withIndex("by_venue", q => q.eq("venueId", args.venueId!))
        .collect();
    } else {
      bookings = await ctx.db.query("sportsVenueBookings").collect();
    }
    return bookings.filter(b => b.status === "active");
  },
});

export const bookVenue = mutation({
  args: {
    venueId: v.id("sportsVenues"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin" && user.role !== "coach") {
      throw new Error("Unauthorized");
    }
    
    // Check for conflict
    const existing = await ctx.db
      .query("sportsVenueBookings")
      .withIndex("by_venue", q => q.eq("venueId", args.venueId))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    const hasConflict = existing.some(b => 
      (args.startTime >= b.startTime && args.startTime < b.endTime) ||
      (args.endTime > b.startTime && args.endTime <= b.endTime) ||
      (args.startTime <= b.startTime && args.endTime >= b.endTime)
    );

    if (hasConflict) {
      throw new Error("Venue is already booked for this time slot.");
    }

    return await ctx.db.insert("sportsVenueBookings", {
      venueId: args.venueId,
      coachUserId: user._id,
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "active",
      createdAt: Date.now(),
    });
  },
});
