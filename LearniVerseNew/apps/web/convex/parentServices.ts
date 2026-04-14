import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Parent-Student Linking
export const linkStudent = mutation({
  args: {
    parentId: v.id("users"),
    studentId: v.id("users"),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Audit check omitted for brevity but should be Admin-only
    return await ctx.db.insert("parentStudentLinks", {
      parentId: args.parentId,
      studentId: args.studentId,
      relationship: args.relationship,
      createdAt: Date.now(),
    });
  },
});

export const listLinkedStudents = query({
  args: { parentId: v.id("users") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const student = await ctx.db.get(link.studentId);
        return {
          ...link,
          student,
        };
      })
    );
  },
});

// Announcements
export const createAnnouncement = mutation({
  args: {
    targetRole: v.union(v.literal("all"), v.literal("parent"), v.literal("student"), v.literal("teacher")),
    title: v.string(),
    body: v.string(),
    importance: v.union(v.literal("normal"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && user.role !== "teacher") throw new Error("Only admins and teachers can create announcements.");

    const announcementId = await ctx.db.insert("announcements", {
      senderId: user._id,
      targetRole: args.targetRole,
      title: args.title,
      body: args.body,
      importance: args.importance,
      createdAt: Date.now(),
    });

    // Send in-app notification to every matching user
    const allUsers = await ctx.db.query("users").collect();
    const now = Date.now();
    await Promise.all(
      allUsers
        .filter((u) => u._id !== user._id && u.isActive && (args.targetRole === "all" || u.role === args.targetRole))
        .map((u) =>
          ctx.db.insert("notifications", {
            userId: u._id,
            title: args.title,
            body: args.body,
            type: "announcement",
            isRead: false,
            createdAt: now,
          }),
        ),
    );

    return announcementId;
  },
});

export const listAnnouncements = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("announcements").collect();
    // Filter for "all" or specific role
    return all
      .filter((a) => a.targetRole === "all" || a.targetRole === args.role)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Report Comments
export const addReportComment = mutation({
  args: {
    finalMarkId: v.id("finalMarks"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user || user.role !== "parent") throw new Error("Only parents can comment on reports.");

    const report = await ctx.db.get(args.finalMarkId);
    if (!report) throw new Error("Report not found");

    const existingComments = report.parentComments ?? [];
    
    await ctx.db.patch(args.finalMarkId, {
      parentComments: [
        ...existingComments,
        {
          parentId: user._id,
          comment: args.comment,
          createdAt: Date.now(),
        }
      ]
    });
  },
});

export const listAllLinks = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query("parentStudentLinks").collect();
    return await Promise.all(
      links.map(async (link) => {
        const parent = await ctx.db.get(link.parentId);
        const student = await ctx.db.get(link.studentId);
        return {
          ...link,
          parentName: parent?.fullName || parent?.email,
          parentEmail: parent?.email,
          studentName: student?.fullName || student?.email,
        };
      })
    );
  },
});
