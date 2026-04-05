import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("teacherProfiles").collect();
    return await Promise.all(
      profiles.map(async (profile) => ({
        ...profile,
        user: await ctx.db.get(profile.userId),
      }))
    );
  },
});

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const upsertProfile = mutation({
  args: {
    userId: v.id("users"),
    employeeNumber: v.optional(v.string()),
    facultyId: v.optional(v.string()),
    qualificationText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        employeeNumber: args.employeeNumber,
        facultyId: args.facultyId,
        qualificationText: args.qualificationText,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("teacherProfiles", {
        userId: args.userId,
        employeeNumber: args.employeeNumber,
        facultyId: args.facultyId,
        qualificationText: args.qualificationText,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const removeProfile = mutation({
  args: { id: v.id("teacherProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
