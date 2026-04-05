/**
 * Development seed — creates test teacher, student, and parent accounts
 * plus all supporting academic data (faculty, qualification, course, enrollment,
 * parent-student link).
 *
 * HOW TO USE
 * ──────────
 * 1. Sign up in Clerk using the three test emails below (any password you like,
 *    or use the defaults provided).
 * 2. Open the Convex dashboard → Functions → seed.seedTestUsers → Run.
 *    (No arguments required.)
 * 3. The mutation links everything together and returns a summary.
 *
 * TEST CREDENTIALS  (Gmail aliases — all land in your real inbox)
 * ────────────────────────────────────────────────────────────────
 *   Teacher  → lgumbi2169+teacher@gmail.com   / TeachPass@2025!
 *   Student  → lgumbi2169+student@gmail.com   / StudyPass@2025!
 *   Parent   → lgumbi2169+parent@gmail.com    / ParentPass@2025!
 *
 * Roles are bootstrapped automatically by email on Clerk signup
 * (see BOOTSTRAP_* sets in users.ts).
 */

import { mutation } from "./_generated/server";

export const seedTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // ── 1. Upsert users by email ───────────────────────────────────────────
    async function upsertUser(params: {
      email: string;
      fullName: string;
      firstName: string;
      lastName: string;
      role: "teacher" | "student" | "parent";
    }) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", params.email))
        .first();
      if (existing) {
        // Ensure role is correct (in case they signed up before bootstrap was added)
        if (existing.role !== params.role) {
          await ctx.db.patch(existing._id, { role: params.role, updatedAt: now });
        }
        return existing._id;
      }
      // Create placeholder — will be claimed when user signs in via Clerk
      return await ctx.db.insert("users", {
        clerkUserId: `seed_placeholder_${params.role}_${Date.now()}`,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        fullName: params.fullName,
        role: params.role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const teacherId = await upsertUser({
      email: "lgumbi2169+teacher@gmail.com",
      fullName: "Alex Dlamini",
      firstName: "Alex",
      lastName: "Dlamini",
      role: "teacher",
    });

    const studentId = await upsertUser({
      email: "lgumbi2169+student@gmail.com",
      fullName: "Lwazi Mokoena",
      firstName: "Lwazi",
      lastName: "Mokoena",
      role: "student",
    });

    const parentId = await upsertUser({
      email: "lgumbi2169+parent@gmail.com",
      fullName: "Bongiwe Mokoena",
      firstName: "Bongiwe",
      lastName: "Mokoena",
      role: "parent",
    });

    // ── 2. Teacher profile ─────────────────────────────────────────────────
    const existingTeacherProfile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", teacherId))
      .first();
    const teacherProfileId = existingTeacherProfile?._id ?? await ctx.db.insert("teacherProfiles", {
      userId: teacherId,
      employeeNumber: "EMP-001",
      qualificationText: "B.Ed (Hons) Computer Science",
      createdAt: now,
      updatedAt: now,
    });

    // ── 3. Faculty ─────────────────────────────────────────────────────────
    let faculty = await ctx.db
      .query("faculties")
      .withIndex("by_name", (q) => q.eq("name", "Faculty of Computing"))
      .first();
    if (!faculty) {
      const fid = await ctx.db.insert("faculties", {
        name: "Faculty of Computing",
        code: "FOC",
        description: "Computing, software, and information technology.",
        isActive: true,
      });
      faculty = (await ctx.db.get(fid))!;
    }

    // ── 4. Qualification ───────────────────────────────────────────────────
    const existingQuals = await ctx.db
      .query("qualifications")
      .withIndex("by_faculty", (q) => q.eq("facultyId", faculty!._id))
      .collect();
    let qualification = existingQuals.find((q) => q.code === "BSC-CS");
    if (!qualification) {
      const qid = await ctx.db.insert("qualifications", {
        facultyId: faculty._id,
        name: "BSc Computer Science",
        code: "BSC-CS",
        description: "Three-year undergraduate programme in computing.",
        isActive: true,
      });
      qualification = (await ctx.db.get(qid))!;
    }

    // ── 5. Course assigned to the test teacher ─────────────────────────────
    const existingCourses = await ctx.db
      .query("courses")
      .withIndex("by_teacher_profile", (q) => q.eq("teacherProfileId", teacherProfileId))
      .collect();
    let course = existingCourses[0];
    if (!course) {
      const cid = await ctx.db.insert("courses", {
        courseCode: "CS101",
        courseName: "Introduction to Programming",
        description: "Fundamentals of programming using Python.",
        semester: 1,
        department: "Computer Science",
        price: 2500,
        teacherProfileId,
        qualificationId: qualification._id,
        isPublished: true,
        assignmentWeight: 50,
        quizWeight: 50,
        createdAt: now,
        updatedAt: now,
      });
      course = (await ctx.db.get(cid))!;
    }

    // ── 6. Student enrollment ──────────────────────────────────────────────
    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", studentId))
      .first();

    if (!existingEnrollment) {
      // Create a pre-approved application
      const appId = await ctx.db.insert("enrollmentApplications", {
        studentUserId: studentId,
        facultyId: faculty._id,
        qualificationId: qualification._id,
        selectedCourseIds: [course._id],
        status: "approved",
        paymentStatus: "paid",
        notes: "Seeded by development seed.",
        reviewedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create active enrollment record
      await ctx.db.insert("enrollments", {
        studentUserId: studentId,
        courseId: course._id,
        applicationId: appId,
        enrolledAt: now,
        status: "active",
      });
    }

    // ── 7. Parent-student link ─────────────────────────────────────────────
    const existingLink = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parentId))
      .first();

    if (!existingLink) {
      await ctx.db.insert("parentStudentLinks", {
        parentId,
        studentId,
        relationship: "Parent",
        createdAt: now,
      });
    }

    // ── 8. Summary ─────────────────────────────────────────────────────────
    return {
      message: "✅ Seed complete",
      credentials: {
        teacher: {
          email: "lgumbi2169+teacher@gmail.com",
          password: "TeachPass@2025!",
          role: "teacher",
          name: "Alex Dlamini",
        },
        student: {
          email: "lgumbi2169+student@gmail.com",
          password: "StudyPass@2025!",
          role: "student",
          name: "Lwazi Mokoena",
          enrolledIn: course.courseName,
        },
        parent: {
          email: "lgumbi2169+parent@gmail.com",
          password: "ParentPass@2025!",
          role: "parent",
          name: "Bongiwe Mokoena",
          linkedTo: "Lwazi Mokoena (student)",
        },
      },
      ids: {
        teacherUserId: teacherId,
        studentUserId: studentId,
        parentUserId: parentId,
        courseId: course._id,
        facultyId: faculty._id,
        qualificationId: qualification._id,
      },
    };
  },
});

/**
 * After signing in via Clerk, call this mutation to merge your Clerk identity
 * with the seeded placeholder record (if it was created before your signup).
 * This is only needed if you ran seedTestUsers BEFORE signing up in Clerk.
 */
export const claimSeedAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in via Clerk.");

    // Find the real Clerk-linked record
    const clerkRecord = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!clerkRecord) throw new Error("No Clerk user record found. Sign in first.");

    // Find any placeholder record with the same email
    const normalizedEmail = clerkRecord.email.toLowerCase();
    const placeholder = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect()
      .then((users) =>
        users.find(
          (u) =>
            u._id !== clerkRecord._id &&
            u.clerkUserId.startsWith("seed_placeholder_"),
        ),
      );

    if (!placeholder) {
      return { merged: false, message: "No placeholder record found — nothing to merge." };
    }

    // Re-parent all data from placeholder ID to the real Clerk record ID
    const realId = clerkRecord._id;
    const fakeId = placeholder._id;

    // Enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentUserId", fakeId))
      .collect();
    for (const e of enrollments) {
      await ctx.db.patch(e._id, { studentUserId: realId });
    }

    // Enrollment applications
    const apps = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student", (q) => q.eq("studentUserId", fakeId))
      .collect();
    for (const a of apps) {
      await ctx.db.patch(a._id, { studentUserId: realId });
    }

    // Parent-student links (student side)
    const studentLinks = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_student", (q) => q.eq("studentId", fakeId))
      .collect();
    for (const l of studentLinks) {
      await ctx.db.patch(l._id, { studentId: realId });
    }

    // Parent-student links (parent side)
    const parentLinks = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", fakeId))
      .collect();
    for (const l of parentLinks) {
      await ctx.db.patch(l._id, { parentId: realId });
    }

    // Teacher bookings (student side)
    const studentBookings = await ctx.db
      .query("teacherBookings")
      .withIndex("by_student", (q) => q.eq("studentUserId", fakeId))
      .collect();
    for (const b of studentBookings) {
      await ctx.db.patch(b._id, { studentUserId: realId });
    }

    // Teacher bookings (teacher side)
    const teacherBookings = await ctx.db
      .query("teacherBookings")
      .withIndex("by_teacher", (q) => q.eq("teacherUserId", fakeId))
      .collect();
    for (const b of teacherBookings) {
      await ctx.db.patch(b._id, { teacherUserId: realId });
    }

    // Delete placeholder
    await ctx.db.delete(fakeId);

    return {
      merged: true,
      message: `Merged placeholder into real account (${clerkRecord.email}).`,
    };
  },
});
