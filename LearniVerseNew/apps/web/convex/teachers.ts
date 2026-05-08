import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("teacherProfiles").collect();
    return await Promise.all(
      profiles.map(async (profile) => ({
        ...profile,
        user: await ctx.db.get(profile.userId),
      }))
    );
  },
});

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const upsertProfile = mutation({
  args: {
    userId: v.id("users"),
    employeeNumber: v.optional(v.string()),
    facultyId: v.optional(v.string()),
    qualificationText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        employeeNumber: args.employeeNumber,
        facultyId: args.facultyId,
        qualificationText: args.qualificationText,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("teacherProfiles", {
        userId: args.userId,
        employeeNumber: args.employeeNumber,
        facultyId: args.facultyId,
        qualificationText: args.qualificationText,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const removeProfile = mutation({
  args: { id: v.id("teacherProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Seed: Assign teachers to Maths, Physics & Sciences across all grades ──
const TEACHER_EMAILS = [
  "sitholeandries89@gmail.com",
  "teacher1@learnmanage.dev",
];
const SUBJECT_NAMES = ["Mathematics", "Physical Sciences", "Life Sciences"];

export const seedTeacherSubjects = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allFaculties = await ctx.db.query("faculties").collect();
    const summary: string[] = [];

    for (const email of TEACHER_EMAILS) {
      // Find user
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!user) {
        summary.push(`User not found: ${email}`);
        continue;
      }

      // Ensure role is teacher
      if (user.role !== "teacher") {
        await ctx.db.patch(user._id, { role: "teacher", updatedAt: now });
      }

      // Upsert teacher profile
      let profile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .first();

      if (!profile) {
        const profileId = await ctx.db.insert("teacherProfiles", {
          userId: user._id,
          employeeNumber: `EMP-${user._id.slice(-4).toUpperCase()}`,
          qualificationText: "B.Ed (Hons) Mathematics & Sciences",
          createdAt: now,
          updatedAt: now,
        });
        profile = (await ctx.db.get(profileId))!;
      } else {
        await ctx.db.patch(profile._id, {
          qualificationText: "B.Ed (Hons) Mathematics & Sciences",
          updatedAt: now,
        });
      }

      // For each grade (faculty) x subject, create course + assign teacher
      for (const faculty of allFaculties) {
        if (!faculty.isActive) continue;

        for (const subjectName of SUBJECT_NAMES) {
          const courseCode = `${(faculty.code ?? faculty.name.replace(/\s+/g, "").substring(0, 4)).toUpperCase()}-${subjectName.replace(/[^a-zA-Z]/g, "").substring(0, 6).toUpperCase()}`;

          let course = await ctx.db
            .query("courses")
            .withIndex("by_course_code", (q) => q.eq("courseCode", courseCode))
            .first();

          if (!course) {
            const cid = await ctx.db.insert("courses", {
              courseCode,
              courseName: subjectName,
              description: `${subjectName} for ${faculty.name}`,
              department: faculty.name,
              isPublished: true,
              teacherProfileId: profile._id,
              createdAt: now,
              updatedAt: now,
            });
            course = (await ctx.db.get(cid))!;
            summary.push(`Created ${courseCode} -> ${subjectName} (${faculty.name})`);
          } else {
            // Assign teacher if not already assigned
            if (!course.teacherProfileId || course.teacherProfileId !== profile._id) {
              await ctx.db.patch(course._id, {
                teacherProfileId: profile._id,
                updatedAt: now,
              });
            }
            summary.push(`Linked ${courseCode} -> ${email}`);
          }
        }
      }
    }

    return { success: true, actions: summary };
  },
});

// ── Query: Teacher's assigned grades, subjects & enrolled learners ──
export const listMyClassroom = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user || user.role !== "teacher") return null;

    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return { grades: [], teacherName: user.fullName ?? user.email, qualifications: "" };

    // Get all courses assigned to this teacher
    const allCourses = await ctx.db
      .query("courses")
      .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", profile._id))
      .collect();

    // Group by department (grade)
    const gradeMap = new Map<string, typeof allCourses>();
    for (const course of allCourses) {
      const grade = course.department || "Unassigned";
      if (!gradeMap.has(grade)) gradeMap.set(grade, []);
      gradeMap.get(grade)!.push(course);
    }

    const grades = [];

    for (const [gradeName, courses] of gradeMap) {
      const subjects = [];

      for (const course of courses) {
        // Get enrolled students
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        const learners = [];
        for (const enrollment of enrollments) {
          const student = await ctx.db.get(enrollment.studentUserId);
          if (!student) continue;
          learners.push({
            _id: student._id,
            fullName: student.fullName ?? student.email,
            email: student.email,
            enrolledAt: enrollment.enrolledAt,
            status: enrollment.status,
          });
        }

        subjects.push({
          _id: course._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          learnerCount: learners.length,
          learners: learners.sort((a, b) => a.fullName.localeCompare(b.fullName)),
        });
      }

      grades.push({
        gradeName,
        subjectCount: subjects.length,
        totalLearners: subjects.reduce((sum, s) => sum + s.learnerCount, 0),
        subjects: subjects.sort((a, b) => a.courseName.localeCompare(b.courseName)),
      });
    }

    return {
      teacherName: user.fullName ?? user.email,
      qualifications: profile.qualificationText,
      grades: grades.sort((a, b) => a.gradeName.localeCompare(b.gradeName)),
    };
  },
});
