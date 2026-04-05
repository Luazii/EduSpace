import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    meetingUrl: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      throw new Error("Only teachers or admins can schedule live sessions.");
    }

    return await ctx.db.insert("liveSessions", {
      courseId: args.courseId,
      title: args.title,
      meetingUrl: args.meetingUrl,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      scheduledByUserId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const listByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("liveSessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const now = Date.now();
    return sessions
      .map((s) => ({
        ...s,
        isLive: now >= s.startTime && now <= s.endTime,
      }))
      .sort((a, b) => b.startTime - a.startTime);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("liveSessions"),
    status: v.union(v.literal("scheduled"), v.literal("live"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
