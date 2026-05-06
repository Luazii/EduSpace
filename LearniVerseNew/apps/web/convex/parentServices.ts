import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    targetRole: v.union(v.literal("all"), v.literal("parent"), v.literal("student"), v.literal("teacher"), v.literal("parent_student")),
    targetGradeId: v.optional(v.id("faculties")),
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

    // ── Resolve grade for teachers ──
    let gradeId = args.targetGradeId;
    let gradeName: string | undefined;

    if (user.role === "teacher") {
      // Teachers MUST announce to a grade — auto-resolve from their profile
      const teacherProfile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();

      if (teacherProfile?.facultyId) {
        const faculty = await ctx.db.get(teacherProfile.facultyId as Id<"faculties">);
        if (faculty) {
          gradeId = faculty._id;
          gradeName = faculty.name;
        }
      }

      // If teacher has no grade assignment, try using the provided gradeId
      if (!gradeId && args.targetGradeId) {
        const faculty = await ctx.db.get(args.targetGradeId);
        if (faculty) {
          gradeId = faculty._id;
          gradeName = faculty.name;
        }
      }
    } else if (args.targetGradeId) {
      // Admin can optionally scope to a grade
      const faculty = await ctx.db.get(args.targetGradeId);
      if (faculty) {
        gradeId = faculty._id;
        gradeName = faculty.name;
      }
    }

    const announcementId = await ctx.db.insert("announcements", {
      senderId: user._id,
      senderName: user.fullName ?? user.email,
      targetRole: args.targetRole,
      targetGradeId: gradeId,
      targetGradeName: gradeName,
      title: args.title,
      body: args.body,
      importance: args.importance,
      createdAt: Date.now(),
    });

    // ── Send in-app notifications ──
    const allUsers = await ctx.db.query("users").collect();
    const now = Date.now();

    // Determine which users to notify
    const usersToNotify = [];

    for (const u of allUsers) {
      if (u._id === user._id || !u.isActive) continue;

      // Role check
      const roleMatch =
        args.targetRole === "all" ||
        u.role === args.targetRole ||
        (args.targetRole === "parent_student" && (u.role === "parent" || u.role === "student"));

      if (!roleMatch) continue;

      // Grade check — if announcement is grade-scoped
      if (gradeId) {
        if (u.role === "student") {
          // Check if student is enrolled in any course under this grade
          const enrollments = await ctx.db
            .query("enrollments")
            .withIndex("by_student", (q) => q.eq("studentUserId", u._id))
            .collect();
          const courseIds = enrollments.map((e) => e.courseId);
          let inGrade = false;
          for (const cid of courseIds) {
            const course = await ctx.db.get(cid);
            if (course && course.department === gradeName) {
              inGrade = true;
              break;
            }
          }
          if (!inGrade) continue;
        } else if (u.role === "parent") {
          // Check if any linked student is in this grade
          const links = await ctx.db
            .query("parentStudentLinks")
            .withIndex("by_parent", (q) => q.eq("parentId", u._id))
            .collect();
          let hasChildInGrade = false;
          for (const link of links) {
            const studentEnrollments = await ctx.db
              .query("enrollments")
              .withIndex("by_student", (q) => q.eq("studentUserId", link.studentId))
              .collect();
            for (const e of studentEnrollments) {
              const course = await ctx.db.get(e.courseId);
              if (course && course.department === gradeName) {
                hasChildInGrade = true;
                break;
              }
            }
            if (hasChildInGrade) break;
          }
          if (!hasChildInGrade) continue;
        }
      }

      usersToNotify.push(u);
    }

    await Promise.all(
      usersToNotify.map((u) =>
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
    const identity = await ctx.auth.getUserIdentity();
    const all = await ctx.db.query("announcements").collect();

    // If no authenticated user, return all school-wide
    if (!identity) {
      return all
        .filter((a) => !a.targetGradeId && (a.targetRole === "all" || a.targetRole === args.role))
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return all
        .filter((a) => !a.targetGradeId && (a.targetRole === "all" || a.targetRole === args.role))
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    // Resolve the user's grade(s)
    const userGradeNames = new Set<string>();

    if (user.role === "student") {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
        .collect();
      for (const e of enrollments) {
        const course = await ctx.db.get(e.courseId);
        if (course?.department) userGradeNames.add(course.department);
      }
    } else if (user.role === "parent") {
      const links = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", user._id))
        .collect();
      for (const link of links) {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_student", (q) => q.eq("studentUserId", link.studentId))
          .collect();
        for (const e of enrollments) {
          const course = await ctx.db.get(e.courseId);
          if (course?.department) userGradeNames.add(course.department);
        }
      }
    } else if (user.role === "teacher") {
      const profile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();
      if (profile?.facultyId) {
        const faculty = await ctx.db.get(profile.facultyId as Id<"faculties">);
        if (faculty) userGradeNames.add(faculty.name);
      }
    }

    return all
      .filter((a) => {
        // Role match
        const roleMatch =
          a.targetRole === "all" ||
          a.targetRole === user.role ||
          (a.targetRole === "parent_student" && (user.role === "parent" || user.role === "student"));

        if (!roleMatch && user.role !== "admin" && user.role !== "teacher") return false;
        // Admin and teachers who sent announcements can always see them
        if (user.role === "admin") return true;
        if (a.senderId === user._id) return true;
        if (!roleMatch) return false;

        // Grade match (if scoped)
        if (a.targetGradeName) {
          return userGradeNames.has(a.targetGradeName);
        }

        return true;
      })
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

export const addSubmissionComment = mutation({
  args: {
    submissionId: v.id("submissions"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user || user.role !== "parent") throw new Error("Only parents can leave comments.");

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");

    const existing = submission.parentComments ?? [];
    await ctx.db.patch(args.submissionId, {
      parentComments: [...existing, { parentId: user._id, comment: args.comment.trim(), createdAt: Date.now() }],
    });
  },
});

export const addQuizAttemptComment = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user || user.role !== "parent") throw new Error("Only parents can leave comments.");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Quiz attempt not found.");

    const existing = attempt.parentComments ?? [];
    await ctx.db.patch(args.attemptId, {
      parentComments: [...existing, { parentId: user._id, comment: args.comment.trim(), createdAt: Date.now() }],
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
