import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No application user record exists for this session.");
  return user;
}

export const add = mutation({
  args: {
    submissionId: v.id("submissions"),
    body: v.string(),
    lineRef: v.optional(v.string()),
    parentCommentId: v.optional(v.id("submissionComments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!args.body.trim()) throw new Error("Comment body cannot be empty.");

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");

    // Teachers, admins, and the submitting student may comment
    const isOwner = submission.studentUserId === user._id;
    const canComment =
      isOwner || user.role === "teacher" || user.role === "admin";

    if (!canComment) {
      throw new Error("You are not permitted to comment on this submission.");
    }

    const now = Date.now();
    return await ctx.db.insert("submissionComments", {
      submissionId: args.submissionId,
      authorId: user._id,
      body: args.body.trim(),
      lineRef: args.lineRef,
      parentCommentId: args.parentCommentId,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return [];

    // Only the owner, teachers, and admins can view comments
    const isOwner = submission.studentUserId === user._id;
    const canView = isOwner || user.role === "teacher" || user.role === "admin";
    if (!canView) return [];

    const comments = await ctx.db
      .query("submissionComments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    // Enrich with author info and sort chronologically
    const enriched = await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        return {
          ...c,
          author: author
            ? {
                _id: author._id,
                fullName: author.fullName,
                email: author.email,
                role: author.role,
              }
            : null,
        };
      }),
    );

    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const edit = mutation({
  args: {
    commentId: v.id("submissionComments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment || comment.authorId !== user._id) {
      throw new Error("Comment not found or you do not own it.");
    }
    if (!args.body.trim()) throw new Error("Comment cannot be empty.");

    await ctx.db.patch(args.commentId, {
      body: args.body.trim(),
      isEdited: true,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { commentId: v.id("submissionComments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) throw new Error("Comment not found.");

    const canDelete =
      comment.authorId === user._id ||
      user.role === "teacher" ||
      user.role === "admin";

    if (!canDelete) throw new Error("You cannot delete this comment.");

    await ctx.db.delete(args.commentId);
  },
});
