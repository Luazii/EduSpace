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

export const listByCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const resources = await ctx.db
      .query("resources")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    return await Promise.all(
      resources.map(async (resource) => ({
        ...resource,
        url: resource.storageId ? await ctx.storage.getUrl(resource.storageId) : null,
      })),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const metadata = await ctx.db.system.get("_storage", args.storageId);

    return await ctx.db.insert("resources", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: metadata?.contentType,
      size: metadata?.size,
      uploadedByUserId: user._id,
      createdAt: Date.now(),
    });
  },
});
