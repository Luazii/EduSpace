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

// Teacher assigns a peer reviewer
export const assign = mutation({
  args: {
    submissionId: v.id("submissions"),
    reviewerUserId: v.id("users"),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can assign peer reviews.");
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");

    // Prevent duplicate assignment
    const existing = await ctx.db
      .query("peerReviews")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    if (existing.some((r) => r.reviewerUserId === args.reviewerUserId)) {
      throw new Error("This reviewer is already assigned to this submission.");
    }

    return await ctx.db.insert("peerReviews", {
      submissionId: args.submissionId,
      reviewerUserId: args.reviewerUserId,
      assignedByUserId: user._id,
      isAnonymous: args.isAnonymous,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Reviewer submits their feedback
export const submitReview = mutation({
  args: {
    peerReviewId: v.id("peerReviews"),
    feedback: v.string(),
    mark: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const review = await ctx.db.get(args.peerReviewId);

    if (!review || review.reviewerUserId !== user._id) {
      throw new Error("Peer review not found or you are not the assigned reviewer.");
    }
    if (review.status === "submitted") {
      throw new Error("Review already submitted.");
    }
    if (!args.feedback.trim()) throw new Error("Feedback cannot be empty.");

    await ctx.db.patch(args.peerReviewId, {
      feedback: args.feedback.trim(),
      mark: args.mark,
      status: "submitted",
      submittedAt: Date.now(),
    });
  },
});

// All reviews for a submission (teacher/admin or the submission owner)
export const listForSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return [];

    const isOwner = submission.studentUserId === user._id;
    const canView = isOwner || user.role === "teacher" || user.role === "admin";
    if (!canView) return [];

    const reviews = await ctx.db
      .query("peerReviews")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    return await Promise.all(
      reviews.map(async (review) => {
        const reviewer =
          review.isAnonymous && isOwner
            ? null
            : await ctx.db.get(review.reviewerUserId);

        return {
          ...review,
          reviewer: reviewer
            ? { _id: reviewer._id, fullName: reviewer.fullName, email: reviewer.email }
            : null,
        };
      }),
    );
  },
});

// Reviews assigned to the current user (student peer reviewer)
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const reviews = await ctx.db
      .query("peerReviews")
      .withIndex("by_reviewer", (q) => q.eq("reviewerUserId", user._id))
      .collect();

    return await Promise.all(
      reviews.map(async (review) => {
        const submission = await ctx.db.get(review.submissionId);
        const assignment = submission
          ? await ctx.db.get(submission.assignmentId)
          : null;
        const course = assignment ? await ctx.db.get(assignment.courseId) : null;

        return {
          ...review,
          assignment: assignment
            ? { _id: assignment._id, title: assignment.title }
            : null,
          courseName: course?.courseName ?? null,
        };
      }),
    );
  },
});
