import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return notifications;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});

// Internal helper for other mutations to create notifications
export const createInternal = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("grade"), v.literal("enrollment"), v.literal("deadline"), v.literal("system")),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      body: args.body,
      type: args.type,
      link: args.link,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

export const backfillEnrollmentLinks = mutation({
  args: {},
  handler: async (ctx) => {
    // We allow this to be run by any authenticated user for their own notifications, 
    // or as a global admin tool. For simplicity here, we'll process all 
    // but check for admin role if we want a global sweep.
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    let count = 0;
    
    if (user.role === "admin") {
      // Global sweep for admins
      const notifications = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("type"), "enrollment"))
        .collect();

      for (const notification of notifications) {
        if (!notification.link) {
          const latestApp = await ctx.db
            .query("enrollmentApplications")
            .withIndex("by_student", (q) => q.eq("studentUserId", notification.userId))
            .order("desc")
            .first();

          if (latestApp) {
            await ctx.db.patch(notification._id, {
              link: `/apply/submitted/${latestApp._id}`,
            });
            count++;
          }
        }
      }
    } else {
      // Just for current user
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("type"), "enrollment"))
        .collect();

      for (const notification of notifications) {
        if (!notification.link) {
          const latestApp = await ctx.db
            .query("enrollmentApplications")
            .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
            .order("desc")
            .first();

          if (latestApp) {
            await ctx.db.patch(notification._id, {
              link: `/apply/submitted/${latestApp._id}`,
            });
            count++;
          }
        }
      }
    }
    
    return count;
  },
});
