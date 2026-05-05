import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to view courses.");
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

export const list = query({
  args: {
    department: v.optional(v.string()),
    qualificationId: v.optional(v.id("qualifications")),
  },
  handler: async (ctx, args) => {
    const courses = await (args.qualificationId
      ? ctx.db
          .query("courses")
          .withIndex("by_qualification", (q) => q.eq("qualificationId", args.qualificationId))
      : ctx.db.query("courses")
    ).collect();

    const filteredCourses = args.department
      ? courses.filter((c) => c.department === args.department)
      : courses;


    return await Promise.all(
      courses.map(async (course) => {
        const qualification = course.qualificationId
          ? await ctx.db.get(course.qualificationId)
          : null;
        const faculty = qualification ? await ctx.db.get(qualification.facultyId) : null;

        return {
          ...course,
          qualification,
          faculty,
        };
      }),
    );
  },
});

export const getById = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);

    if (!course) {
      return null;
    }

    const qualification = course.qualificationId
      ? await ctx.db.get(course.qualificationId)
      : null;
    const faculty = qualification ? await ctx.db.get(qualification.facultyId) : null;

    return {
      ...course,
      qualification,
      faculty,
    };
  },
});

export const listTeachingDashboard = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can view the teaching dashboard.");
    }

    const courses = await ctx.db.query("courses").collect();
    const resources = await ctx.db.query("resources").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const quizzes = await ctx.db.query("quizzes").collect();
    const submissions = await ctx.db.query("submissions").collect();

    return courses
      .map((course) => {
        const courseAssignments = assignments.filter(
          (assignment) => assignment.courseId === course._id,
        );
        const latestSubmissions = new Map<string, (typeof submissions)[number]>();

        for (const submission of [...submissions]
          .filter((entry) =>
            courseAssignments.some(
              (assignment) => assignment._id === entry.assignmentId,
            ),
          )
          .sort((a, b) => b.submittedAt - a.submittedAt)) {
          const key = `${submission.assignmentId}:${submission.studentUserId}`;

          if (!latestSubmissions.has(key)) {
            latestSubmissions.set(key, submission);
          }
        }

        const latestSubmissionList = [...latestSubmissions.values()];

        return {
          ...course,
          resourcesCount: resources.filter((resource) => resource.courseId === course._id)
            .length,
          assignmentsCount: courseAssignments.length,
          quizzesCount: quizzes.filter((quiz) => quiz.courseId === course._id).length,
          latestSubmissionsCount: latestSubmissionList.length,
          pendingGradingCount: latestSubmissionList.filter(
            (submission) => typeof submission.mark !== "number",
          ).length,
          gradedSubmissionsCount: latestSubmissionList.filter(
            (submission) => typeof submission.mark === "number",
          ).length,
        };
      })
      .sort((a, b) => {
        if (a.pendingGradingCount !== b.pendingGradingCount) {
          return b.pendingGradingCount - a.pendingGradingCount;
        }

        return a.courseName.localeCompare(b.courseName);
      });
  },
});

export const create = mutation({
  args: {
    courseCode: v.string(),
    courseName: v.string(),
    description: v.optional(v.string()),
    semester: v.optional(v.number()),
    department: v.string(),
    price: v.optional(v.number()),
    qualificationId: v.optional(v.id("qualifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("courses", {
      courseCode: args.courseCode,
      courseName: args.courseName,
      description: args.description,
      department: args.department,
      semester: args.semester,
      price: args.price,
      qualificationId: args.qualificationId,
      teacherProfileId: undefined,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getGradebook = query({
  args: { courseId: v.optional(v.id("courses")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return null;
    }

    const courses = args.courseId 
      ? [await ctx.db.get(args.courseId)].filter(Boolean) as any[]
      : await ctx.db.query("courses").collect();

    const result = [];

    for (const course of courses) {
      const teacherProfileDoc = course.teacherProfileId 
        ? await ctx.db.get(course.teacherProfileId) 
        : null;

      // Access control: Teachers only see their own courses unless they are admin
      if (user.role === "teacher" && (teacherProfileDoc as any)?.userId !== user._id) {
        continue;
      }

      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const courseQuizzes = await ctx.db
        .query("quizzes")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const courseAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const students = [];

      for (const enrollment of enrollments) {
        const student = await ctx.db.get(enrollment.studentUserId);
        if (!student) continue;

        // Quiz attempts
        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseAttempts = attempts.filter(a => courseQuizzes.some(q => q._id === a.quizId));
        const quizPercent = courseAttempts.length > 0
          ? courseAttempts.reduce((sum, a) => sum + (a.score / (a.maxScore || 1)) * 100, 0) / courseAttempts.length
          : null;

        // Assignments
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseSubmissions = submissions.filter(s => courseAssignments.some(a => a._id === s.assignmentId) && typeof s.mark === "number");
        const assignmentPercent = courseSubmissions.length > 0
          ? courseSubmissions.reduce((sum, s) => {
              const assignment = courseAssignments.find(a => a._id === s.assignmentId);
              return sum + ((s.mark ?? 0) / (assignment?.maxMark || 1)) * 100;
            }, 0) / courseSubmissions.length
          : null;

        const qWeight = course.quizWeight ?? 50;
        const aWeight = course.assignmentWeight ?? 50;

        const weightedAverage = (quizPercent !== null && assignmentPercent !== null)
          ? (quizPercent * qWeight) / 100 + (assignmentPercent * aWeight) / 100
          : null;

        const finalMarkRecord = await ctx.db
          .query("finalMarks")
          .withIndex("by_course_and_student", (q) => q.eq("courseId", course._id).eq("studentUserId", student._id))
          .first();

        students.push({
          userId: student._id,
          fullName: student.fullName,
          studentNumber: student.email.split("@")[0], // Placeholder fallback
          quizPercent,
          assignmentPercent,
          weightedAverage,
          finalMark: finalMarkRecord?.computedFinalMark,
          isPublished: finalMarkRecord?.status === "published",
        });
      }

      result.push({
        courseId: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        students: students.sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? "")),
      });
    }

    return result;
  },
});

export const updateWeights = mutation({
  args: {
    courseId: v.id("courses"),
    assignmentWeight: v.number(),
    quizWeight: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can update course weights.");
    }

    if (args.assignmentWeight + args.quizWeight !== 100) {
      throw new Error("Total weighting must equal 100%.");
    }

    await ctx.db.patch(args.courseId, {
      assignmentWeight: args.assignmentWeight,
      quizWeight: args.quizWeight,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.courseId);
  },
});

export const finalizeMark = mutation({
  args: {
    courseId: v.id("courses"),
    studentUserId: v.id("users"),
    finalMark: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!caller || (caller.role !== "admin" && caller.role !== "teacher")) {
      throw new Error("Unauthorized: Only teachers or admins can finalize marks.");
    }

    const existing = await ctx.db
      .query("finalMarks")
      .withIndex("by_course_and_student", (q) => q.eq("courseId", args.courseId).eq("studentUserId", args.studentUserId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        computedFinalMark: args.finalMark,
        notes: args.notes,
        status: "published",
        updatedAt: now,
        publishedAt: now,
        publishedByUserId: caller._id,
      });
    } else {
      await ctx.db.insert("finalMarks", {
        courseId: args.courseId,
        studentUserId: args.studentUserId,
        computedFinalMark: args.finalMark,
        notes: args.notes,
        status: "published",
        updatedAt: now,
        publishedAt: now,
        publishedByUserId: caller._id,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("courses"),
    courseCode: v.optional(v.string()),
    courseName: v.optional(v.string()),
    description: v.optional(v.string()),
    department: v.optional(v.string()),
    semester: v.optional(v.number()),
    price: v.optional(v.number()),
    qualificationId: v.optional(v.id("qualifications")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Unauthorized");

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Unauthorized");
    
    await ctx.db.delete(args.id);
  },
});

export const getStudentFinalMarks = query({
  args: { studentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const finalMarks = await ctx.db
      .query("finalMarks")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    const allSubmissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    const allAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .collect();

    return await Promise.all(
      finalMarks.map(async (mark) => {
        const course = await ctx.db.get(mark.courseId);

        const courseAssignments = await ctx.db
          .query("assignments")
          .withIndex("by_course", (q) => q.eq("courseId", mark.courseId))
          .collect();

        const courseQuizzes = await ctx.db
          .query("quizzes")
          .withIndex("by_course", (q) => q.eq("courseId", mark.courseId))
          .collect();

        // Assignment percent: average across latest graded submissions
        const courseSubmissions = allSubmissions.filter(
          (s) => courseAssignments.some((a) => a._id === s.assignmentId) && typeof s.mark === "number",
        );
        const computedAssignmentPercent =
          courseSubmissions.length > 0
            ? Math.round(
                courseSubmissions.reduce((sum, s) => {
                  const assignment = courseAssignments.find((a) => a._id === s.assignmentId);
                  return sum + ((s.mark ?? 0) / (assignment?.maxMark || 1)) * 100;
                }, 0) / courseSubmissions.length,
              )
            : 0;

        // Quiz percent: best attempt per quiz, then average
        const courseAttempts = allAttempts.filter((a) =>
          courseQuizzes.some((q) => q._id === a.quizId),
        );
        const bestByQuiz = new Map<string, (typeof courseAttempts)[0]>();
        for (const attempt of [...courseAttempts].sort(
          (a, b) => b.score - a.score || b.submittedAt - a.submittedAt,
        )) {
          if (!bestByQuiz.has(String(attempt.quizId))) {
            bestByQuiz.set(String(attempt.quizId), attempt);
          }
        }
        const bestAttempts = [...bestByQuiz.values()];
        const computedQuizPercent =
          bestAttempts.length > 0
            ? Math.round(
                bestAttempts.reduce(
                  (sum, a) => sum + (a.score / (a.maxScore || 1)) * 100,
                  0,
                ) / bestAttempts.length,
              )
            : 0;

        return {
          ...mark,
          courseName: course?.courseName ?? "Unknown Course",
          courseCode: course?.courseCode ?? "???",
          semester: course?.semester ?? null,
          computedAssignmentPercent,
          computedQuizPercent,
        };
      }),
    );
  },
});
