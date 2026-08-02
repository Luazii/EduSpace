import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedOmniData = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      throw new Error(`Teacher profile not found for: ${args.email}`);
    }

    const courseCode = `GLOBAL-SUPPORT-${profile._id.substring(0, 6).toUpperCase()}`;
    const course = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", courseCode))
      .first();

    if (!course) {
      throw new Error(`Global support course not found for: ${args.email}. Please run createOmniTeacher first.`);
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    const enrolledStudentIds = enrollments.map(e => e.studentUserId);

    // Seed Live Session
    const liveSessionCount = await ctx.db
      .query("liveSessions")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    
    if (liveSessionCount.length === 0) {
      await ctx.db.insert("liveSessions", {
        courseId: course._id,
        title: "OmniTeacher Introduction & Q&A",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        startTime: now + DAY * 2, // 2 days from now
        endTime: now + DAY * 2 + 60 * 60 * 1000,
        status: "scheduled",
        scheduledByUserId: user._id,
        createdAt: now,
      });
    }

    // Seed Assignment
    const assignmentTitle = "Mid-Term Omni Assessment";
    let assignment = await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .filter((q) => q.eq(q.field("title"), assignmentTitle))
      .first();

    if (!assignment) {
      const assignmentId = await ctx.db.insert("assignments", {
        courseId: course._id,
        title: assignmentTitle,
        description: "Please complete this assessment covering all grades.",
        maxMark: 100,
        deadline: now + DAY * 7,
        isPublished: true,
        createdByUserId: user._id,
        createdAt: now,
      });
      assignment = (await ctx.db.get(assignmentId))!;
    }

    // Seed Quiz
    const quizTitle = "General Knowledge Quiz";
    let quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .filter((q) => q.eq(q.field("title"), quizTitle))
      .first();

    if (!quiz) {
      const quizId = await ctx.db.insert("quizzes", {
        courseId: course._id,
        title: quizTitle,
        description: "A quick 5-question test for omni learners.",
        maxAttempts: 2,
        status: "published",
        createdByUserId: user._id,
        createdAt: now,
      });
      quiz = (await ctx.db.get(quizId))!;
      
      // Add questions
      await ctx.db.insert("questions", {
        quizId: quiz._id,
        prompt: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        weighting: 1,
        position: 1,
      });
    }

    // Seed Submissions for grading queue (if they don't already exist)
    let newSubmissions = 0;
    for (let i = 0; i < Math.min(10, enrolledStudentIds.length); i++) {
      const studentId = enrolledStudentIds[i];
      const existingSub = await ctx.db
        .query("submissions")
        .withIndex("by_assignment_and_student", (q) => 
          q.eq("assignmentId", assignment!._id).eq("studentUserId", studentId)
        )
        .first();

      if (!existingSub) {
        await ctx.db.insert("submissions", {
          assignmentId: assignment._id,
          studentUserId: studentId,
          fileName: `omni_submission_${i}.pdf`,
          submittedAt: now - DAY * (i % 3),
        });
        newSubmissions++;
      }
    }

    return {
      success: true,
      message: `Seeded assignments, quizzes, live sessions, and ${newSubmissions} ungraded submissions for ${args.email}.`,
    };
  }
});
