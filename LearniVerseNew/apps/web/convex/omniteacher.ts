import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createOmniTeacher = mutation({
  args: {
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email ?? "omniteacher@learnmanage.dev";
    const firstName = args.firstName ?? "Omni";
    const lastName = args.lastName ?? "Teacher";
    const now = Date.now();

    // 1. Create or get the teacher user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkUserId: `seed_placeholder_${Date.now()}`,
        email,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        role: "teacher",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.get(userId))!;
    } else if (user.role !== "teacher") {
      await ctx.db.patch(user._id, { role: "teacher", updatedAt: now });
    }

    // 2. Create or get the teacher profile
    let profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      const profileId = await ctx.db.insert("teacherProfiles", {
        userId: user._id,
        employeeNumber: `EMP-OMNI-${Date.now().toString().slice(-4)}`,
        qualificationText: "Master Teacher / Student Support",
        createdAt: now,
        updatedAt: now,
      });
      profile = (await ctx.db.get(profileId))!;
    }

    // 3. For each active faculty (Grade), create a "Student Support" course and enroll all learners of that grade
    const faculties = await ctx.db.query("faculties").collect();
    let totalLearnersGivenAccess = 0;

    for (const faculty of faculties) {
      if (!faculty.isActive) continue;

      const courseCode = `SUPPORT-${faculty.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
      
      // Check if course exists
      let course = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", courseCode))
        .first();

      if (!course) {
        const courseId = await ctx.db.insert("courses", {
          courseCode,
          courseName: `Student Support - ${faculty.name}`,
          description: "General access course for comprehensive learner support.",
          department: faculty.name,
          teacherProfileId: profile._id,
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        });
        course = (await ctx.db.get(courseId))!;
      } else {
        // Ensure omniteacher is assigned to it
        if (course.teacherProfileId !== profile._id) {
          await ctx.db.patch(course._id, { teacherProfileId: profile._id, updatedAt: now });
        }
      }

      // Find all students in this grade by looking at their existing enrollments in this faculty's courses
      // Wait, we can just find all students in the system and enroll them if they aren't already.
      // But to be precise, let's find all active students and enroll them all into their respective Support course.
      // Actually, since this OmniTeacher should see ALL students, let's just enroll ALL students in the system into a single global support course if we don't care about grades.
      // But the teacher dashboard groups by department (grade). It's better to enroll them per grade.
      
      // Let's just find all students with 'studentProfiles' and enroll them.
    }

    // To make sure OmniTeacher has access to literally ALL learners, 
    // let's create a single Global course and enroll ALL students in it.
    const globalCourseCode = `GLOBAL-SUPPORT-${profile._id.substring(0, 6).toUpperCase()}`;
    let globalCourse = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", globalCourseCode))
      .first();

    if (!globalCourse) {
      const globalCourseId = await ctx.db.insert("courses", {
        courseCode: globalCourseCode,
        courseName: "Global Learner Access",
        description: "Administrative course giving this teacher access to all learners.",
        department: "All Grades",
        teacherProfileId: profile._id,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      });
      globalCourse = (await ctx.db.get(globalCourseId))!;
    } else {
      await ctx.db.patch(globalCourse._id, { teacherProfileId: profile._id, updatedAt: now });
    }

    // Enroll all users who have role === "student"
    const allStudents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    for (const student of allStudents) {
      const existingEnrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", student._id))
        .filter((q) => q.eq(q.field("courseId"), globalCourse._id))
        .first();

      if (!existingEnrollment) {
        // Create a dummy application
        const appId = await ctx.db.insert("enrollmentApplications", {
          studentUserId: student._id,
          selectedCourseIds: [globalCourse._id],
          status: "approved",
          paymentStatus: "paid",
          notes: "Auto-enrolled for OmniTeacher access.",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("enrollments", {
          studentUserId: student._id,
          courseId: globalCourse._id,
          applicationId: appId,
          enrolledAt: now,
          status: "active",
        });
        totalLearnersGivenAccess++;
      }
    }

    return {
      success: true,
      message: `Created/updated OmniTeacher (${email}). They now have access to all ${allStudents.length} learners.`,
      newEnrollments: totalLearnersGivenAccess,
    };
  },
});
