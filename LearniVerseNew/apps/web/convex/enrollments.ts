import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in to perform this action.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No application user record exists for this session.");
  return user;
}

async function getOptionalUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

async function enrichApplication(
  ctx: QueryCtx | MutationCtx,
  application: Doc<"enrollmentApplications">,
) {
  const { facultyId } = application;
  const faculty = facultyId ? await ctx.db.get(facultyId) : null;
  const qualification = await ctx.db.get(application.qualificationId);
  const courses = await Promise.all(
    application.selectedCourseIds.map((courseId: Id<"courses">) => ctx.db.get(courseId)),
  );
  const student = await ctx.db.get(application.studentUserId);
  const studentProfile = student
    ? await ctx.db
        .query("studentProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", student._id))
        .first()
    : null;
  const nscSubmission = application.nscSubmissionId
    ? await ctx.db.get(application.nscSubmissionId)
    : null;
  const totalAmount = courses
    .filter(Boolean)
    .reduce((sum, course) => sum + (course?.price ?? 0), 0);

  return {
    ...application,
    faculty,
    qualification,
    courses: courses.filter(Boolean),
    student,
    studentProfile,
    nscSubmission,
    totalAmount,
  };
}

export const getDraft = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const draft = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    const latestDraft =
      draft
        .filter((application) => application.status === "draft")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

    return latestDraft ? await enrichApplication(ctx, latestDraft) : null;
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const applications = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    const enriched = await Promise.all(
      applications
        .filter((application) => application.status !== "draft")
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((application) => enrichApplication(ctx, application)),
    );

    return enriched;
  },
});

export const listMyActiveCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const courses = await Promise.all(
      activeEnrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        if (!course) return null;

        const qualification = course.qualificationId
          ? await ctx.db.get(course.qualificationId)
          : null;
        const faculty = qualification ? await ctx.db.get(qualification.facultyId) : null;

        return {
          ...course,
          qualification,
          faculty,
          enrolledAt: enrollment.enrolledAt,
        };
      }),
    );

    return courses.filter(Boolean);
  },
});

export const listAllMyDeadlines = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const deadlines = [];

    for (const enrollment of activeEnrollments) {
      const course = await ctx.db.get(enrollment.courseId);
      if (!course) continue;

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_course", (q) => q.eq("courseId", enrollment.courseId))
        .collect();

      const publishedAssignments = assignments.filter((a) => a.isPublished && a.deadline && a.deadline > Date.now());

      for (const assignment of publishedAssignments) {
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_and_student", (q) => q.eq("assignmentId", assignment._id).eq("studentUserId", user._id))
          .first();

        if (!submission) {
          deadlines.push({
            ...assignment,
            courseCode: course.courseCode,
            courseName: course.courseName,
          });
        }
      }
    }

    return deadlines.sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0)).slice(0, 3);
  },
});

export const listAllMyLiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const liveSessions = [];

    for (const enrollment of activeEnrollments) {
      const course = await ctx.db.get(enrollment.courseId);
      if (!course) continue;

      const sessions = await ctx.db
        .query("liveSessions")
        .withIndex("by_course", (q) => q.eq("courseId", enrollment.courseId))
        .collect();

      // Get sessions that are live or starting in the next 24 hours
      const relevantSessions = sessions.filter(
        (s) => s.status === "live" || (s.status === "scheduled" && s.startTime < Date.now() + 24 * 60 * 60 * 1000 && s.endTime > Date.now())
      );

      for (const session of relevantSessions) {
        liveSessions.push({
          ...session,
          courseCode: course.courseCode,
          courseName: course.courseName,
        });
      }
    }

    return liveSessions.sort((a, b) => a.startTime - b.startTime);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "admin") {
      throw new Error("Only admins can view enrollment review queues.");
    }

    const applications = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const rejected = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();
    const approved = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const combined = [...applications, ...rejected, ...approved].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );

    return await Promise.all(combined.map((application) => enrichApplication(ctx, application)));
  },
});

export const getById = query({
  args: {
    applicationId: v.id("enrollmentApplications"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    if (user.role !== "admin" && application.studentUserId !== user._id) {
      throw new Error("You do not have access to this application.");
    }

    return await enrichApplication(ctx, application);
  },
});

export const generateNscUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveDraft = mutation({
  args: {
    qualificationId: v.optional(v.id("qualifications")),
    selectedCourseIds: v.optional(v.array(v.id("courses"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const drafts = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    const existingDraft =
      drafts
        .filter((application) => application.status === "draft")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

    const now = Date.now();

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        qualificationId: args.qualificationId ?? existingDraft.qualificationId,
        selectedCourseIds: args.selectedCourseIds ?? existingDraft.selectedCourseIds,
        notes: args.notes ?? existingDraft.notes,
        updatedAt: now,
      });
      return existingDraft._id;
    }

    if (!args.qualificationId) {
      throw new Error("Grade is required to create a draft.");
    }

    return await ctx.db.insert("enrollmentApplications", {
      studentUserId: user._id,
      qualificationId: args.qualificationId,
      selectedCourseIds: args.selectedCourseIds ?? [],
      status: "draft",
      paymentStatus: "not_started",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const submitApplication = mutation({
  args: {
    qualificationId: v.id("qualifications"),
    selectedCourseIds: v.array(v.id("courses")),
    notes: v.optional(v.string()),
    gender: v.optional(v.string()),
    dob: v.optional(v.number()),
    phone: v.optional(v.string()),
    birthCertStorageId: v.optional(v.id("_storage")),
    parentIdStorageId: v.optional(v.id("_storage")),
    proofOfResidenceStorageId: v.optional(v.id("_storage")),
    schoolReportStorageId: v.optional(v.id("_storage")),
    transferLetterStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      phone: args.phone ?? user.phone,
      updatedAt: now,
    });

    const existingProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        gender: args.gender ?? existingProfile.gender,
        dob: args.dob ?? existingProfile.dob,
        qualificationId: args.qualificationId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("studentProfiles", {
        userId: user._id,
        gender: args.gender,
        dob: args.dob,
        qualificationId: args.qualificationId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const drafts = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    const existingDraft =
      drafts
        .filter((application) => application.status === "draft")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

    const docFields = {
      birthCertStorageId: args.birthCertStorageId,
      parentIdStorageId: args.parentIdStorageId,
      proofOfResidenceStorageId: args.proofOfResidenceStorageId,
      schoolReportStorageId: args.schoolReportStorageId,
      transferLetterStorageId: args.transferLetterStorageId,
    };

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        qualificationId: args.qualificationId,
        selectedCourseIds: args.selectedCourseIds,
        ...docFields,
        notes: args.notes,
        status: "submitted",
        paymentStatus: "pending",
        updatedAt: now,
      });
      return existingDraft._id;
    }

    return await ctx.db.insert("enrollmentApplications", {
      studentUserId: user._id,
      qualificationId: args.qualificationId,
      selectedCourseIds: args.selectedCourseIds,
      ...docFields,
      status: "submitted",
      paymentStatus: "pending",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approveApplication = mutation({
  args: {
    applicationId: v.id("enrollmentApplications"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "admin") {
      throw new Error("Only admins can approve applications.");
    }

    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      throw new Error("Application not found.");
    }

    for (const courseId of application.selectedCourseIds) {
      const existingEnrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_application", (q) => q.eq("applicationId", application._id))
        .collect();

      if (!existingEnrollment.some((enrollment) => enrollment.courseId === courseId)) {
        await ctx.db.insert("enrollments", {
          studentUserId: application.studentUserId,
          courseId,
          applicationId: application._id,
          enrolledAt: Date.now(),
          status: "active",
        });
      }
    }

    await ctx.db.patch(application._id, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedByUserId: user._id,
      updatedAt: Date.now(),
    });

    // 3. Notify Student
    await ctx.db.insert("notifications", {
      userId: application.studentUserId,
      title: "Admissions Update",
      body: "Institutional Review of your application has been completed. You are now formally enrolled.",
      type: "enrollment",
      isRead: false,
      createdAt: Date.now(),
    });

    return application._id;
  },
});

export const rejectApplication = mutation({
  args: {
    applicationId: v.id("enrollmentApplications"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "admin") {
      throw new Error("Only admins can reject applications.");
    }

    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      throw new Error("Application not found.");
    }

    await ctx.db.patch(application._id, {
      status: "rejected",
      notes: args.notes ?? application.notes,
      reviewedAt: Date.now(),
      reviewedByUserId: user._id,
      updatedAt: Date.now(),
    });

    // 3. Notify Student
    await ctx.db.insert("notifications", {
      userId: application.studentUserId,
      title: "Admissions Update",
      body: "Institutional Review of your application has been completed. Please check your dashboard for institutional feedback.",
      type: "enrollment",
      isRead: false,
      createdAt: Date.now(),
    });

    return application._id;
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
