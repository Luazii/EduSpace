import { v } from "convex/values";
import { query, type QueryCtx, type MutationCtx } from "./_generated/server";

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

// NSC achievement level from percent
export function achievementLevel(pct: number | null): {
  level: number;
  label: string;
  color: string;
} {
  if (pct === null) return { level: 0, label: "Pending", color: "slate" };
  if (pct >= 80) return { level: 7, label: "Outstanding", color: "emerald" };
  if (pct >= 70) return { level: 6, label: "Meritorious", color: "sky" };
  if (pct >= 60) return { level: 5, label: "Substantial", color: "blue" };
  if (pct >= 50) return { level: 4, label: "Adequate", color: "violet" };
  if (pct >= 40) return { level: 3, label: "Moderate", color: "amber" };
  if (pct >= 30) return { level: 2, label: "Elementary", color: "orange" };
  return { level: 1, label: "Not Achieved", color: "rose" };
}

// ── Per-assignment + per-quiz breakdown for one student in one course ──────────
// Used by parent portal and student progress view
export const getStudentCourseBreakdown = query({
  args: {
    courseId: v.id("courses"),
    studentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);

    const isTeacherOrAdmin = caller.role === "teacher" || caller.role === "admin";
    const isSelf = caller._id === args.studentUserId;

    let isParent = false;
    if (caller.role === "parent") {
      const links = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", caller._id))
        .collect();
      isParent = links.some((l) => l.studentId === args.studentUserId);
    }

    if (!isTeacherOrAdmin && !isSelf && !isParent) {
      throw new Error("Access denied.");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found.");

    const aWeight = course.assignmentWeight ?? 50;
    const qWeight = course.quizWeight ?? 50;

    // ── Assignments ──
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const assignmentBreakdown = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_and_student", (q) =>
            q.eq("assignmentId", assignment._id).eq("studentUserId", args.studentUserId),
          )
          .order("desc")
          .first();

        const gradeVisible = isTeacherOrAdmin || submission?.isReleased !== false;
        const mark = gradeVisible ? (submission?.mark ?? null) : null;
        const percent =
          typeof mark === "number" && assignment.maxMark
            ? Math.round((mark / assignment.maxMark) * 100)
            : null;

        return {
          _id: assignment._id,
          title: assignment.title,
          maxMark: assignment.maxMark ?? null,
          deadline: assignment.deadline ?? null,
          submission: submission
            ? {
                _id: submission._id,
                submittedAt: submission.submittedAt,
                mark,
                feedback: gradeVisible ? (submission.feedback ?? null) : null,
                gradedAt: gradeVisible ? (submission.gradedAt ?? null) : null,
                isReleased: gradeVisible,
              }
            : null,
          percent,
        };
      }),
    );

    // ── Quizzes ──
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const quizBreakdown = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_quiz_and_student", (q) =>
            q.eq("quizId", quiz._id).eq("studentUserId", args.studentUserId),
          )
          .collect();

        const best = [...attempts].sort((a, b) => b.score - a.score)[0] ?? null;
        const percent =
          best && best.maxScore ? Math.round((best.score / best.maxScore) * 100) : null;

        return {
          _id: quiz._id,
          title: quiz.title,
          maxAttempts: quiz.maxAttempts,
          attemptsUsed: attempts.length,
          bestScore: best?.score ?? null,
          maxScore: best?.maxScore ?? null,
          percent,
          lastAttemptAt: best?.submittedAt ?? null,
        };
      }),
    );

    // ── Weighted summary ──
    const gradedAssignments = assignmentBreakdown.filter((a) => a.percent !== null);
    const avgAssignmentPct =
      gradedAssignments.length
        ? Math.round(
            gradedAssignments.reduce((s, a) => s + (a.percent ?? 0), 0) /
              gradedAssignments.length,
          )
        : null;

    const completedQuizzes = quizBreakdown.filter((q) => q.percent !== null);
    const avgQuizPct =
      completedQuizzes.length
        ? Math.round(
            completedQuizzes.reduce((s, q) => s + (q.percent ?? 0), 0) /
              completedQuizzes.length,
          )
        : null;

    const weightedFinal =
      avgAssignmentPct !== null && avgQuizPct !== null
        ? Math.round((avgAssignmentPct * aWeight + avgQuizPct * qWeight) / 100)
        : avgAssignmentPct ?? avgQuizPct;

    // Published final mark record (visible to parents when published)
    const finalMark = await ctx.db
      .query("finalMarks")
      .withIndex("by_course_and_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentUserId", args.studentUserId),
      )
      .first();

    const publishedMark =
      finalMark?.status === "published"
        ? {
            effectiveMark: finalMark.overrideMark ?? finalMark.computedFinalMark ?? weightedFinal,
            notes: finalMark.notes ?? null,
            publishedAt: finalMark.publishedAt ?? null,
          }
        : null;

    return {
      course: {
        _id: course._id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        assignmentWeight: aWeight,
        quizWeight: qWeight,
      },
      assignments: assignmentBreakdown,
      quizzes: quizBreakdown,
      summary: {
        avgAssignmentPct,
        avgQuizPct,
        weightedFinal,
        assignmentWeight: aWeight,
        quizWeight: qWeight,
      },
      publishedMark,
    };
  },
});

// ── Full report for a student across all their courses ─────────────────────────
// Used by parent portal landing (replaces getStudentFinalMarks for richer data)
export const getStudentFullReport = query({
  args: { studentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);

    const isTeacherOrAdmin = caller.role === "teacher" || caller.role === "admin";
    const isSelf = caller._id === args.studentUserId;

    let isParent = false;
    if (caller.role === "parent") {
      const links = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", caller._id))
        .collect();
      isParent = links.some((l) => l.studentId === args.studentUserId);
    }

    if (!isTeacherOrAdmin && !isSelf && !isParent) throw new Error("Access denied.");

    // Courses the student is enrolled in
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", args.studentUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const student = await ctx.db.get(args.studentUserId);

    const courseReports = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        if (!course) return null;

        const aWeight = course.assignmentWeight ?? 50;
        const qWeight = course.quizWeight ?? 50;

        // Assignments
        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        const assignmentRows = await Promise.all(
          assignments.map(async (a) => {
            const sub = await ctx.db
              .query("submissions")
              .withIndex("by_assignment_and_student", (q) =>
                q.eq("assignmentId", a._id).eq("studentUserId", args.studentUserId),
              )
              .order("desc")
              .first();

            const gradeVisible = isTeacherOrAdmin || sub?.isReleased !== false;
            const mark = gradeVisible ? (sub?.mark ?? null) : null;
            const percent =
              typeof mark === "number" && a.maxMark
                ? Math.round((mark / a.maxMark) * 100)
                : null;

            return {
              _id: a._id,
              submissionId: sub?._id ?? null,
              title: a.title,
              maxMark: a.maxMark ?? null,
              deadline: a.deadline ?? null,
              mark,
              percent,
              feedback: gradeVisible ? (sub?.feedback ?? null) : null,
              submittedAt: sub?.submittedAt ?? null,
              gradedAt: gradeVisible ? (sub?.gradedAt ?? null) : null,
              parentComments: sub?.parentComments ?? [],
            };
          }),
        );

        // Quizzes
        const quizzes = await ctx.db
          .query("quizzes")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        const quizRows = await Promise.all(
          quizzes.map(async (quiz) => {
            const attempts = await ctx.db
              .query("quizAttempts")
              .withIndex("by_quiz_and_student", (q) =>
                q.eq("quizId", quiz._id).eq("studentUserId", args.studentUserId),
              )
              .collect();

            const best = [...attempts].sort((a, b) => b.score - a.score)[0] ?? null;
            const percent =
              best && best.maxScore
                ? Math.round((best.score / best.maxScore) * 100)
                : null;

            return {
              _id: quiz._id,
              bestAttemptId: best?._id ?? null,
              title: quiz.title,
              attemptsUsed: attempts.length,
              maxAttempts: quiz.maxAttempts,
              bestScore: best?.score ?? null,
              maxScore: best?.maxScore ?? null,
              percent,
              lastAttemptAt: best?.submittedAt ?? null,
              parentComments: best?.parentComments ?? [],
            };
          }),
        );

        // Summary
        const gradedA = assignmentRows.filter((a) => a.percent !== null);
        const avgA = gradedA.length
          ? Math.round(gradedA.reduce((s, a) => s + (a.percent ?? 0), 0) / gradedA.length)
          : null;

        const completedQ = quizRows.filter((q) => q.percent !== null);
        const avgQ = completedQ.length
          ? Math.round(
              completedQ.reduce((s, q) => s + (q.percent ?? 0), 0) / completedQ.length,
            )
          : null;

        const weightedFinal =
          avgA !== null && avgQ !== null
            ? Math.round((avgA * aWeight + avgQ * qWeight) / 100)
            : avgA ?? avgQ;

        const manualMarks = await ctx.db
          .query("manualMarks")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", course._id).eq("studentUserId", args.studentUserId),
          )
          .collect();
        const manualAverage =
          manualMarks.length > 0
            ? Math.round(
                manualMarks.reduce(
                  (sum, entry) => sum + (entry.mark / entry.maxMark) * 100,
                  0,
                ) / manualMarks.length,
              )
            : null;

        // Published final mark
        const finalMark = await ctx.db
          .query("finalMarks")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", course._id).eq("studentUserId", args.studentUserId),
          )
          .first();

        // Parents and students can see current progress
        const showFinal = true;

        return {
          courseId: course._id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          semester: course.semester ?? null,
          assignmentWeight: aWeight,
          quizWeight: qWeight,
          assignments: assignmentRows,
          quizzes: quizRows,
          manualMarks: manualMarks
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((entry) => ({
              _id: entry._id,
              assessmentName: entry.assessmentName,
              assessmentType: entry.assessmentType,
              termLabel: entry.termLabel ?? null,
              mark: entry.mark,
              maxMark: entry.maxMark,
              comment: entry.comment ?? null,
              capturedAt: entry.capturedAt,
              percent: Math.round((entry.mark / entry.maxMark) * 100),
            })),
          summary: {
            avgAssignmentPct: avgA,
            avgQuizPct: avgQ,
            manualAverage,
            weightedFinal: showFinal ? (weightedFinal ?? manualAverage) : null,
          },
          finalMark: showFinal && finalMark?.status === "published"
            ? {
                _id: finalMark._id,
                effectiveMark:
                  finalMark.overrideMark ??
                  finalMark.computedFinalMark ??
                  weightedFinal ??
                  manualAverage,
                notes: finalMark.notes ?? null,
                publishedAt: finalMark.publishedAt ?? null,
                parentComments: finalMark.parentComments ?? [],
              }
            : null,
        };
      }),
    );

    return {
      student: student
        ? { _id: student._id, fullName: student.fullName, email: student.email }
        : null,
      courses: courseReports.filter(Boolean),
    };
  },
});

// ── At-risk students across all courses for teacher/admin ─────────────────────
export const getAtRiskOverview = query({
  args: { threshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "teacher" && caller.role !== "admin") {
      throw new Error("Only teachers and admins can view at-risk data.");
    }

    const threshold = args.threshold ?? 50;
    const courses = await ctx.db.query("courses").collect();

    const rows: Array<{
      courseId: string;
      courseName: string;
      courseCode: string;
      studentId: string;
      studentName: string | null;
      studentEmail: string;
      effectiveMark: number;
      assignmentPct: number | null;
      quizPct: number | null;
      status: "critical" | "at-risk";
      pendingAssignments: number;
    }> = [];

    for (const course of courses) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const quizzes = await ctx.db
        .query("quizzes")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const aWeight = course.assignmentWeight ?? 50;
      const qWeight = course.quizWeight ?? 50;

      for (const enrollment of enrollments) {
        const student = await ctx.db.get(enrollment.studentUserId);
        if (!student) continue;

        // Graded submissions
        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseGraded = subs.filter(
          (s) =>
            assignments.some((a) => a._id === s.assignmentId) &&
            typeof s.mark === "number",
        );

        const avgA = courseGraded.length
          ? courseGraded.reduce((sum, s) => {
              const a = assignments.find((a) => a._id === s.assignmentId);
              return sum + ((s.mark ?? 0) / (a?.maxMark || 1)) * 100;
            }, 0) / courseGraded.length
          : null;

        // Best quiz attempts
        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseAttempts = attempts.filter((a) =>
          quizzes.some((q) => q._id === a.quizId),
        );
        const bestByQuiz = new Map<string, (typeof courseAttempts)[number]>();
        for (const att of [...courseAttempts].sort((a, b) => b.score - a.score)) {
          if (!bestByQuiz.has(String(att.quizId))) bestByQuiz.set(String(att.quizId), att);
        }

        const avgQ =
          bestByQuiz.size > 0
            ? [...bestByQuiz.values()].reduce(
                (sum, a) => sum + (a.score / (a.maxScore || 1)) * 100,
                0,
              ) / bestByQuiz.size
            : null;

        const effectiveMark =
          avgA !== null && avgQ !== null
            ? (avgA * aWeight + avgQ * qWeight) / 100
            : avgA ?? avgQ;

        if (typeof effectiveMark === "number" && effectiveMark < threshold) {
          const submitted = new Set(subs.map((s) => String(s.assignmentId)));
          const pendingAssignments = assignments.filter(
            (a) => !submitted.has(String(a._id)),
          ).length;

          rows.push({
            courseId: String(course._id),
            courseName: course.courseName,
            courseCode: course.courseCode,
            studentId: String(student._id),
            studentName: student.fullName ?? null,
            studentEmail: student.email,
            effectiveMark: Math.round(effectiveMark * 10) / 10,
            assignmentPct: avgA !== null ? Math.round(avgA * 10) / 10 : null,
            quizPct: avgQ !== null ? Math.round(avgQ * 10) / 10 : null,
            status: effectiveMark < 40 ? "critical" : "at-risk",
            pendingAssignments,
          });
        }
      }
    }

    return rows.sort((a, b) => a.effectiveMark - b.effectiveMark);
  },
});

// ── Top-performing students across all courses for admin ──────────────────────
export const getTopStudentsOverview = query({
  args: { threshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (caller.role !== "teacher" && caller.role !== "admin") {
      throw new Error("Only teachers and admins can view performance data.");
    }

    const threshold = args.threshold ?? 75;
    const courses = await ctx.db.query("courses").collect();

    const rows: Array<{
      courseId: string;
      courseName: string;
      courseCode: string;
      studentId: string;
      studentName: string | null;
      studentEmail: string;
      effectiveMark: number;
      assignmentPct: number | null;
      quizPct: number | null;
    }> = [];

    for (const course of courses) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const quizzes = await ctx.db
        .query("quizzes")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      const aWeight = course.assignmentWeight ?? 50;
      const qWeight = course.quizWeight ?? 50;

      for (const enrollment of enrollments) {
        const student = await ctx.db.get(enrollment.studentUserId);
        if (!student) continue;

        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseGraded = subs.filter(
          (s) =>
            assignments.some((a) => a._id === s.assignmentId) &&
            typeof s.mark === "number",
        );

        const avgA = courseGraded.length
          ? courseGraded.reduce((sum, s) => {
              const a = assignments.find((a) => a._id === s.assignmentId);
              return sum + ((s.mark ?? 0) / (a?.maxMark || 1)) * 100;
            }, 0) / courseGraded.length
          : null;

        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
          .collect();

        const courseAttempts = attempts.filter((a) =>
          quizzes.some((q) => q._id === a.quizId),
        );
        const bestByQuiz = new Map<string, (typeof courseAttempts)[number]>();
        for (const att of [...courseAttempts].sort((a, b) => b.score - a.score)) {
          if (!bestByQuiz.has(String(att.quizId))) bestByQuiz.set(String(att.quizId), att);
        }

        const avgQ =
          bestByQuiz.size > 0
            ? [...bestByQuiz.values()].reduce(
                (sum, a) => sum + (a.score / (a.maxScore || 1)) * 100,
                0,
              ) / bestByQuiz.size
            : null;

        const effectiveMark =
          avgA !== null && avgQ !== null
            ? (avgA * aWeight + avgQ * qWeight) / 100
            : avgA ?? avgQ;

        if (typeof effectiveMark === "number" && effectiveMark >= threshold) {
          rows.push({
            courseId: String(course._id),
            courseName: course.courseName,
            courseCode: course.courseCode,
            studentId: String(student._id),
            studentName: student.fullName ?? null,
            studentEmail: student.email,
            effectiveMark: Math.round(effectiveMark * 10) / 10,
            assignmentPct: avgA !== null ? Math.round(avgA * 10) / 10 : null,
            quizPct: avgQ !== null ? Math.round(avgQ * 10) / 10 : null,
          });
        }
      }
    }

    return rows.sort((a, b) => b.effectiveMark - a.effectiveMark);
  },
});
