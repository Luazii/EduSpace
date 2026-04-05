import { v } from "convex/values";

import { mutation, type MutationCtx } from "./_generated/server";

async function getCurrentUser(ctx: MutationCtx) {
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

export const create = mutation({
  args: {
    studySessionId: v.id("studySessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.studySessionId);

    if (!session || session.studentUserId !== user._id) {
      throw new Error("Study session not found.");
    }

    const existing = await ctx.db
      .query("taskItems")
      .withIndex("by_study_session", (q) => q.eq("studySessionId", args.studySessionId))
      .collect();

    return await ctx.db.insert("taskItems", {
      studySessionId: args.studySessionId,
      title: args.title,
      description: args.description,
      isComplete: false,
      position: existing.length + 1,
    });
  },
});

export const toggle = mutation({
  args: {
    taskItemId: v.id("taskItems"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const taskItem = await ctx.db.get(args.taskItemId);

    if (!taskItem) {
      throw new Error("Task item not found.");
    }

    const session = await ctx.db.get(taskItem.studySessionId);

    if (!session || session.studentUserId !== user._id) {
      throw new Error("Study session not found.");
    }

    await ctx.db.patch(taskItem._id, {
      isComplete: !taskItem.isComplete,
    });

    return taskItem._id;
  },
});
