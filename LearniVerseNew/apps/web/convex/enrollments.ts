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

function checkAutoApproval(currentMarks?: Array<{ subject: string; mark: number }>) {
  if (!currentMarks || currentMarks.length === 0) return false;
  const sum = currentMarks.reduce((acc, curr) => acc + curr.mark, 0);
  const avg = sum / currentMarks.length;
  return avg >= 90;
}

async function enrichApplication(
  ctx: QueryCtx | MutationCtx,
  application: Doc<"enrollmentApplications">,
) {
  const { facultyId, qualificationId } = application;
  const faculty = facultyId ? await ctx.db.get(facultyId) : null;
  const qualification = qualificationId ? await ctx.db.get(qualificationId) : null;
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
  const GRADE_PRICES: Record<string, number> = {
    "Grade 8": 7500,
    "Grade 9": 8750,
    "Grade 10": 10000,
    "Grade 11": 11250,
    "Grade 12": 12500,
  };
  const BASE_APPLICATION_FEE = application.gradeLabel ? (GRADE_PRICES[application.gradeLabel] ?? 7500) : 7500;
  const totalAmount = BASE_APPLICATION_FEE + courses
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

/**
 * Self-service enrollment claim — runs when a student loads their dashboard.
 * Matches their email against paid applications and creates enrollment records
 * if they were missed during the initial upsertFromClerk call (e.g. Google sign-in
 * timing, or sign-in before payment was completed).
 *
 * For high school applications, selectedCourseIds is typically empty and subjects
 * are stored in selectedSubjectNames. In this case, we auto-create courses for
 * each subject under the application's grade.
 */
export const claimMyEnrollments = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return { claimed: 0 };

    const normalizedEmail = user.email.trim().toLowerCase();
    const now = Date.now();

    // Find paid applications matching this user's email that don't have enrollments yet
    const matchingApps = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student_email", (q) => q.eq("studentEmail", normalizedEmail))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "approved"),
            q.eq(q.field("status"), "pre_approved"),
          ),
          q.eq(q.field("paymentStatus"), "paid"),
        ),
      )
      .collect();

    let claimed = 0;

    for (const app of matchingApps) {
      // Skip if enrollment records already exist for this application
      const existingEnrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_application", (q) => q.eq("applicationId", app._id))
        .first();

      if (existingEnrollment) continue;

      // Create student profile if missing
      const existingProfile = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();

      if (!existingProfile) {
        await ctx.db.insert("studentProfiles", {
          userId: user._id,
          qualificationId: app.gradeLabel,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Ensure role is "student"
      if (user.role !== "student") {
        await ctx.db.patch(user._id, { role: "student", updatedAt: now });
      }

      // Create parent–student link
      const existingLink = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .first();

      if (!existingLink) {
        await ctx.db.insert("parentStudentLinks", {
          parentId: app.studentUserId,
          studentId: user._id,
          createdAt: now,
        });
      }

      // ── Resolve course IDs to enrol in ──
      // For high school apps, selectedCourseIds is [] — subjects are in selectedSubjectNames.
      // We auto-create/find a course record for each subject so the student can be enrolled.
      let courseIdsToEnroll: Id<"courses">[] = [];

      if (app.selectedCourseIds.length > 0) {
        // University-style: courses already exist
        courseIdsToEnroll = app.selectedCourseIds;
      } else if (app.selectedSubjectNames && app.selectedSubjectNames.length > 0) {
        // High school: create or find a course for each subject
        const grade = app.gradeLabel ?? "High School";
        for (const subjectName of app.selectedSubjectNames) {
          const courseCode = `${grade.replace(/\s+/g, "").toUpperCase()}-${subjectName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8).toUpperCase()}`;

          // Check if this subject-course already exists
          let existingCourse = await ctx.db
            .query("courses")
            .withIndex("by_course_code", (q) => q.eq("courseCode", courseCode))
            .first();

          if (!existingCourse) {
            const courseId = await ctx.db.insert("courses", {
              courseCode,
              courseName: subjectName,
              description: `${subjectName} — ${grade}`,
              department: grade,
              isPublished: true,
              qualificationId: app.qualificationId,
              createdAt: now,
              updatedAt: now,
            });
            courseIdsToEnroll.push(courseId);
          } else {
            courseIdsToEnroll.push(existingCourse._id);
          }
        }

        // Update the application to reference the course IDs
        await ctx.db.patch(app._id, {
          selectedCourseIds: courseIdsToEnroll,
          updatedAt: now,
        });
      }

      // Create enrollment records
      for (const courseId of courseIdsToEnroll) {
        await ctx.db.insert("enrollments", {
          studentUserId: user._id,
          courseId,
          applicationId: app._id,
          enrolledAt: now,
          status: "active",
        });
      }

      // Mark application as fully approved
      await ctx.db.patch(app._id, {
        status: "approved",
        updatedAt: now,
      });

      const subjectCount = courseIdsToEnroll.length;

      // Notify the parent
      await ctx.db.insert("notifications", {
        userId: app.studentUserId,
        title: "Learner Account Activated",
        body: `${user.fullName ?? user.email} has signed in and is now enrolled in ${app.gradeLabel ?? "High School"} with ${subjectCount} subject${subjectCount !== 1 ? "s" : ""}. They can start learning immediately.`,
        type: "enrollment",
        isRead: false,
        createdAt: now,
      });

      // Notify the student
      await ctx.db.insert("notifications", {
        userId: user._id,
        title: `Welcome to ${app.gradeLabel ?? "High School"}!`,
        body: `Your account is active and you are enrolled in ${subjectCount} subject${subjectCount !== 1 ? "s" : ""}. Head to your dashboard to start learning!`,
        type: "enrollment",
        isRead: false,
        createdAt: now,
      });

      claimed++;
    }

    return { claimed };
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
    const preApproved = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "pre_approved"))
      .collect();
    const rejected = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();
    const approved = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const combined = [...applications, ...preApproved, ...rejected, ...approved].sort(
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
    gradeLabel: v.optional(v.string()),
    selectedCourseIds: v.optional(v.array(v.id("courses"))),
    selectedSubjectNames: v.optional(v.array(v.string())),
    currentMarks: v.optional(
      v.array(
        v.object({
          subject: v.string(),
          mark: v.number(),
        }),
      ),
    ),
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
        gradeLabel: args.gradeLabel ?? existingDraft.gradeLabel,
        selectedCourseIds: args.selectedCourseIds ?? existingDraft.selectedCourseIds,
        selectedSubjectNames: args.selectedSubjectNames ?? existingDraft.selectedSubjectNames,
        currentMarks: args.currentMarks ?? existingDraft.currentMarks,
        notes: args.notes ?? existingDraft.notes,
        updatedAt: now,
      });
      return existingDraft._id;
    }

    if (!args.gradeLabel) {
      throw new Error("Grade is required to create a draft.");
    }

    return await ctx.db.insert("enrollmentApplications", {
      studentUserId: user._id,
      gradeLabel: args.gradeLabel,
      selectedCourseIds: args.selectedCourseIds ?? [],
      selectedSubjectNames: args.selectedSubjectNames,
      currentMarks: args.currentMarks,
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
    qualificationId: v.optional(v.id("qualifications")),
    gradeLabel: v.optional(v.string()),
    // The learner being registered by the parent
    studentEmail: v.string(),
    studentFirstName: v.optional(v.string()),
    studentLastName: v.optional(v.string()),
    selectedCourseIds: v.array(v.id("courses")),
    selectedSubjectNames: v.optional(v.array(v.string())),
    currentMarks: v.optional(
      v.array(
        v.object({
          subject: v.string(),
          mark: v.number(),
        }),
      ),
    ),
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

    const gradeDisplay = args.gradeLabel ?? "High School";
    const isAutoApproved = checkAutoApproval(args.currentMarks);
    const initialStatus = isAutoApproved ? "pre_approved" : "submitted";
    let finalNotes = args.notes;
    if (isAutoApproved) {
      finalNotes = finalNotes ? finalNotes + "\n\n[Auto-Approved: Average score >= 90%, awaiting admin manual verification for fraud check]" : "[Auto-Approved: Average score >= 90%, awaiting admin manual verification for fraud check]";
    }

    const studentEmail = args.studentEmail.trim().toLowerCase();
    const studentName = [args.studentFirstName, args.studentLastName].filter(Boolean).join(" ") || studentEmail;

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        qualificationId: args.qualificationId,
        gradeLabel: args.gradeLabel,
        studentEmail,
        studentFirstName: args.studentFirstName,
        studentLastName: args.studentLastName,
        selectedCourseIds: args.selectedCourseIds,
        selectedSubjectNames: args.selectedSubjectNames,
        currentMarks: args.currentMarks,
        ...docFields,
        notes: finalNotes,
        status: initialStatus,
        paymentStatus: "pending",
        updatedAt: now,
      });

      await ctx.db.insert("notifications", {
        userId: user._id,
        title: isAutoApproved ? "Application Pre-Approved" : "Application Submitted",
        body: isAutoApproved
          ? `${studentName}'s application meets our academic requirements and is pre-approved! Your spot is tentatively reserved pending a manual document review.`
          : `${studentName}'s ${gradeDisplay} enrolment application has been received and is under review. You will be notified once a decision is made.`,
        type: "enrollment",
        link: `/apply/submitted/${existingDraft._id}`,
        isRead: false,
        createdAt: now,
      });

      return existingDraft._id;
    }

    const applicationId = await ctx.db.insert("enrollmentApplications", {
      studentUserId: user._id,
      qualificationId: args.qualificationId,
      gradeLabel: args.gradeLabel,
      studentEmail,
      studentFirstName: args.studentFirstName,
      studentLastName: args.studentLastName,
      selectedCourseIds: args.selectedCourseIds,
      selectedSubjectNames: args.selectedSubjectNames,
      currentMarks: args.currentMarks,
      ...docFields,
      status: initialStatus,
      paymentStatus: "pending",
      notes: finalNotes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      title: isAutoApproved ? "Application Pre-Approved" : "Application Submitted",
      body: isAutoApproved
        ? `${studentName}'s application meets our academic requirements and is pre-approved! Your spot is tentatively reserved pending a manual document review.`
        : `${studentName}'s ${gradeDisplay} enrolment application has been received and is under review. You will be notified once a decision is made.`,
      type: "enrollment",
      link: `/apply/submitted/${applicationId}`,
      isRead: false,
      createdAt: now,
    });

    return applicationId;
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

    await ctx.db.patch(application._id, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedByUserId: user._id,
      updatedAt: Date.now(),
    });

    const studentName = [application.studentFirstName, application.studentLastName].filter(Boolean).join(" ")
      || application.studentEmail
      || "Your learner";
    const grade = application.gradeLabel ?? "High School";

    // Notify the parent to pay
    await ctx.db.insert("notifications", {
      userId: application.studentUserId,
      title: "Application Approved — Pay to Enrol",
      body: `${studentName}'s application for ${grade} has been approved! Please pay the registration fee to secure their place and send them their access link.`,
      type: "enrollment",
      link: `/apply/submitted/${application._id}`,
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
      title: "Application Rejected",
      body: "We regret to let you know that your application has been rejected. Please check your dashboard for institutional feedback.",
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
