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
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    return await Promise.all(
      sessions
        .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
        .map(async (session) => ({
          ...session,
          taskItems: await ctx.db
            .query("taskItems")
            .withIndex("by_study_session", (q) => q.eq("studySessionId", session._id))
            .collect(),
        })),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    sessionDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db.insert("studySessions", {
      studentUserId: user._id,
      title: args.title,
      sessionDate: args.sessionDate,
      notes: args.notes,
      status: "planned",
      createdAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: {
    studySessionId: v.id("studySessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.studySessionId);

    if (!session || session.studentUserId !== user._id) {
      throw new Error("Study session not found.");
    }

    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    return session._id;
  },
});
