import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const schedule = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    participantIds: v.array(v.id("users")),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("meetings", {
      title: args.title,
      description: args.description,
      participantIds: args.participantIds,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listByParticipant = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_participant", (q) => q.eq("participantIds", [args.userId])) // This may need refinement for array logic
      .collect();
  },
});

// Better query for participant logic
export const listMyMeetings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const all = await ctx.db.query("meetings").collect();
    return all.filter(m => m.participantIds.includes(user._id));
  },
});

export const confirmAttendance = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });
  },
});

export const recordOutcome = mutation({
  args: { 
    meetingId: v.id("meetings"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, {
      status: "completed",
      outcomeNotes: args.notes,
      updatedAt: Date.now(),
    });
  },
});
