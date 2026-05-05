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
import type { Id } from "./_generated/dataModel";

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

/**
 * Seeds English (quizzes) and Maths (assignments) for Grades 8–12.
 *
 * English per grade:
 *   - 2 published quizzes (5 questions each, 2 marks per question = 10 total)
 *   - Students A, B, C → completed both quizzes (score 8/10 = 80%)
 *   - Student D → not started (no attempt records)
 *
 * Maths per grade:
 *   - 2 published assignments (maxMark 50)
 *   - Student A → submitted both, both graded at 67% (mark = 34)
 *   - Student B → submitted both, ungraded (no mark)
 *   - Student C → submitted assignment 1 only, graded at 67%
 *   - Student D → no submission (the one unsubmitted per grade)
 *
 * Idempotent — safe to run multiple times.
 */
export const seedAcademicData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // ── helpers ───────────────────────────────────────────────────────────
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
      if (existing) return existing._id;
      return ctx.db.insert("users", {
        clerkUserId: `seed_${params.role}_${params.email.replace(/[^a-z0-9]/gi, "_")}`,
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

    async function upsertTeacherProfile(userId: Id<"users">, employeeNumber: string) {
      const existing = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      if (existing) return existing._id;
      return ctx.db.insert("teacherProfiles", {
        userId,
        employeeNumber,
        qualificationText: "B.Ed (Hons)",
        createdAt: now,
        updatedAt: now,
      });
    }

    async function upsertCourse(params: {
      courseCode: string;
      courseName: string;
      department: string;
      teacherProfileId: Id<"teacherProfiles">;
    }) {
      const existing = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", params.courseCode))
        .first();
      if (existing) return existing._id;
      return ctx.db.insert("courses", {
        ...params,
        description: `${params.courseName} curriculum.`,
        semester: 1,
        isPublished: true,
        assignmentWeight: 50,
        quizWeight: 50,
        createdAt: now,
        updatedAt: now,
      });
    }

    async function ensureEnrollment(studentUserId: Id<"users">, courseId: Id<"courses">) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", studentUserId))
        .collect();
      if (enrollments.some((e) => e.courseId === courseId)) return;
      const appId = await ctx.db.insert("enrollmentApplications", {
        studentUserId,
        selectedCourseIds: [courseId],
        status: "approved",
        paymentStatus: "paid",
        notes: "Seeded by seedAcademicData.",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("enrollments", {
        studentUserId,
        courseId,
        applicationId: appId,
        enrolledAt: now,
        status: "active",
      });
    }

    // ── teachers ─────────────────────────────────────────────────────────
    const engTeacherId = await upsertUser({
      email: "seed+eng.teacher@learnmanage.dev",
      fullName: "Ms. Thandiwe Khumalo",
      firstName: "Thandiwe",
      lastName: "Khumalo",
      role: "teacher",
    });
    const mathTeacherId = await upsertUser({
      email: "seed+math.teacher@learnmanage.dev",
      fullName: "Mr. Sipho Ndlovu",
      firstName: "Sipho",
      lastName: "Ndlovu",
      role: "teacher",
    });
    const engTeacherProfileId = await upsertTeacherProfile(engTeacherId, "EMP-ENG-001");
    const mathTeacherProfileId = await upsertTeacherProfile(mathTeacherId, "EMP-MATH-001");

    // ── students (4 per grade) ────────────────────────────────────────────
    const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

    const studentDefs: {
      email: string;
      fullName: string;
      firstName: string;
      lastName: string;
      grade: string;
    }[] = [
      // Grade 8
      { email: "seed+g8.amahle@learnmanage.dev", fullName: "Amahle Dube", firstName: "Amahle", lastName: "Dube", grade: "Grade 8" },
      { email: "seed+g8.lindo@learnmanage.dev", fullName: "Lindo Mthembu", firstName: "Lindo", lastName: "Mthembu", grade: "Grade 8" },
      { email: "seed+g8.nomsa@learnmanage.dev", fullName: "Nomsa Zulu", firstName: "Nomsa", lastName: "Zulu", grade: "Grade 8" },
      { email: "seed+g8.thabo@learnmanage.dev", fullName: "Thabo Sithole", firstName: "Thabo", lastName: "Sithole", grade: "Grade 8" },
      // Grade 9
      { email: "seed+g9.zanele@learnmanage.dev", fullName: "Zanele Nkosi", firstName: "Zanele", lastName: "Nkosi", grade: "Grade 9" },
      { email: "seed+g9.mpho@learnmanage.dev", fullName: "Mpho Molefe", firstName: "Mpho", lastName: "Molefe", grade: "Grade 9" },
      { email: "seed+g9.bongani@learnmanage.dev", fullName: "Bongani Khumalo", firstName: "Bongani", lastName: "Khumalo", grade: "Grade 9" },
      { email: "seed+g9.siyanda@learnmanage.dev", fullName: "Siyanda Cele", firstName: "Siyanda", lastName: "Cele", grade: "Grade 9" },
      // Grade 10
      { email: "seed+g10.lerato@learnmanage.dev", fullName: "Lerato Mokoena", firstName: "Lerato", lastName: "Mokoena", grade: "Grade 10" },
      { email: "seed+g10.sipho@learnmanage.dev", fullName: "Sipho Dlamini", firstName: "Sipho", lastName: "Dlamini", grade: "Grade 10" },
      { email: "seed+g10.nomvula@learnmanage.dev", fullName: "Nomvula Ntuli", firstName: "Nomvula", lastName: "Ntuli", grade: "Grade 10" },
      { email: "seed+g10.ayanda@learnmanage.dev", fullName: "Ayanda Mthembu", firstName: "Ayanda", lastName: "Mthembu", grade: "Grade 10" },
      // Grade 11
      { email: "seed+g11.khanya@learnmanage.dev", fullName: "Khanya Shabalala", firstName: "Khanya", lastName: "Shabalala", grade: "Grade 11" },
      { email: "seed+g11.nandi@learnmanage.dev", fullName: "Nandi Vilakazi", firstName: "Nandi", lastName: "Vilakazi", grade: "Grade 11" },
      { email: "seed+g11.thandeka@learnmanage.dev", fullName: "Thandeka Mkhize", firstName: "Thandeka", lastName: "Mkhize", grade: "Grade 11" },
      { email: "seed+g11.sbusiso@learnmanage.dev", fullName: "Sbusiso Ngcobo", firstName: "Sbusiso", lastName: "Ngcobo", grade: "Grade 11" },
      // Grade 12
      { email: "seed+g12.palesa@learnmanage.dev", fullName: "Palesa Mahlangu", firstName: "Palesa", lastName: "Mahlangu", grade: "Grade 12" },
      { email: "seed+g12.lungisa@learnmanage.dev", fullName: "Lungisa Mthethwa", firstName: "Lungisa", lastName: "Mthethwa", grade: "Grade 12" },
      { email: "seed+g12.gugu@learnmanage.dev", fullName: "Gugu Nxumalo", firstName: "Gugu", lastName: "Nxumalo", grade: "Grade 12" },
      { email: "seed+g12.phiway@learnmanage.dev", fullName: "Phiwayinkosi Buthelezi", firstName: "Phiwayinkosi", lastName: "Buthelezi", grade: "Grade 12" },
    ];

    const studentIdsByGrade: Record<string, Id<"users">[]> = {};
    for (const def of studentDefs) {
      const id = await upsertUser({ ...def, role: "student" });
      if (!studentIdsByGrade[def.grade]) studentIdsByGrade[def.grade] = [];
      studentIdsByGrade[def.grade].push(id);
    }

    // ── courses ───────────────────────────────────────────────────────────
    const engCourseIds: Record<string, Id<"courses">> = {};
    const mathCourseIds: Record<string, Id<"courses">> = {};

    for (const grade of GRADES) {
      const n = grade.split(" ")[1];
      engCourseIds[grade] = await upsertCourse({
        courseCode: `ENG-G${n}`,
        courseName: `English Home Language Grade ${n}`,
        department: "Languages",
        teacherProfileId: engTeacherProfileId,
      });
      mathCourseIds[grade] = await upsertCourse({
        courseCode: `MATH-G${n}`,
        courseName: `Mathematics Grade ${n}`,
        department: "Mathematics",
        teacherProfileId: mathTeacherProfileId,
      });
    }

    // ── enroll students ───────────────────────────────────────────────────
    for (const grade of GRADES) {
      for (const studentId of studentIdsByGrade[grade] ?? []) {
        await ensureEnrollment(studentId, engCourseIds[grade]);
        await ensureEnrollment(studentId, mathCourseIds[grade]);
      }
    }

    // ── English quizzes + attempts ────────────────────────────────────────
    // 5 questions per quiz, 2 marks each = 10 total; completed students score 8/10 (80%)
    const ENG_QUESTIONS = [
      {
        prompt: "Which sentence is grammatically correct?",
        options: ["Me and him went.", "He and I went.", "Him and me went.", "I and he went."],
        correctAnswer: "He and I went.",
      },
      {
        prompt: "What is the plural of 'child'?",
        options: ["childs", "childes", "children", "childer"],
        correctAnswer: "children",
      },
      {
        prompt: "Which word is a synonym of 'happy'?",
        options: ["sad", "elated", "angry", "bored"],
        correctAnswer: "elated",
      },
      {
        prompt: "Identify the adverb: 'She ran quickly.'",
        options: ["She", "ran", "quickly", "None"],
        correctAnswer: "quickly",
      },
      {
        prompt: "What literary device is used in 'the sun smiled down'?",
        options: ["simile", "alliteration", "personification", "hyperbole"],
        correctAnswer: "personification",
      },
    ];

    for (const grade of GRADES) {
      const n = grade.split(" ")[1];
      const courseId = engCourseIds[grade];
      const gradeStudents = studentIdsByGrade[grade] ?? [];

      for (let term = 1; term <= 2; term++) {
        const quizTitle = `Term ${term} Language Quiz`;

        // Upsert quiz
        const existingQuizzes = await ctx.db
          .query("quizzes")
          .withIndex("by_course", (q) => q.eq("courseId", courseId))
          .collect();
        let quizId: Id<"quizzes">;
        const existingQuiz = existingQuizzes.find((q) => q.title === quizTitle);
        if (existingQuiz) {
          quizId = existingQuiz._id;
        } else {
          quizId = await ctx.db.insert("quizzes", {
            courseId,
            title: quizTitle,
            description: `Grade ${n} English Term ${term} language assessment.`,
            maxAttempts: 1,
            status: "published",
            createdByUserId: engTeacherId,
            createdAt: now - 21 * DAY,
          });
        }

        // Upsert questions
        const existingQs = await ctx.db
          .query("questions")
          .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
          .collect();
        let questionIds: Id<"questions">[];
        if (existingQs.length >= ENG_QUESTIONS.length) {
          questionIds = existingQs.map((q) => q._id);
        } else {
          questionIds = [];
          for (let i = 0; i < ENG_QUESTIONS.length; i++) {
            const def = ENG_QUESTIONS[i];
            const qId = await ctx.db.insert("questions", {
              quizId,
              prompt: def.prompt,
              options: def.options,
              correctAnswer: def.correctAnswer,
              weighting: 2,
              position: i + 1,
            });
            questionIds.push(qId);
          }
        }

        // Students A, B, C (indices 0–2) = completed; Student D (index 3) = not started
        for (let si = 0; si <= 2; si++) {
          const studentId = gradeStudents[si];
          if (!studentId) continue;

          const existingAttempt = await ctx.db
            .query("quizAttempts")
            .withIndex("by_quiz_and_student", (q) =>
              q.eq("quizId", quizId).eq("studentUserId", studentId),
            )
            .first();
          if (existingAttempt) continue;

          // 4/5 correct = 80% = score 8 out of 10
          // Get wrong on question index 4 (last one)
          const answers = questionIds.map((qId, idx) => ({
            questionId: qId,
            answer: idx === 4 ? "simile" : ENG_QUESTIONS[idx].correctAnswer,
          }));

          await ctx.db.insert("quizAttempts", {
            quizId,
            studentUserId: studentId,
            answers,
            score: 8,
            maxScore: 10,
            submittedAt: now - 7 * DAY,
          });
        }
        // Student D (index 3) intentionally left without attempt
      }
    }

    // ── Maths assignments + submissions ───────────────────────────────────
    const MATH_ASSIGN_MAX = 50;
    const MARK_67 = Math.round(MATH_ASSIGN_MAX * 0.67); // = 34

    for (const grade of GRADES) {
      const n = grade.split(" ")[1];
      const courseId = mathCourseIds[grade];
      const gradeStudents = studentIdsByGrade[grade] ?? [];

      for (let assignNo = 1; assignNo <= 2; assignNo++) {
        const assignTitle = `Assignment ${assignNo}: Algebraic Expressions`;

        const existingAssigns = await ctx.db
          .query("assignments")
          .withIndex("by_course", (q) => q.eq("courseId", courseId))
          .collect();
        let assignmentId: Id<"assignments">;
        const existingAssign = existingAssigns.find((a) => a.title === assignTitle);
        if (existingAssign) {
          assignmentId = existingAssign._id;
        } else {
          assignmentId = await ctx.db.insert("assignments", {
            courseId,
            title: assignTitle,
            description: `Grade ${n} Mathematics ${assignTitle}`,
            maxMark: MATH_ASSIGN_MAX,
            isPublished: true,
            createdByUserId: mathTeacherId,
            createdAt: now - 14 * DAY,
          });
        }

        for (let si = 0; si < gradeStudents.length; si++) {
          const studentId = gradeStudents[si];

          // Student D (index 3) = unsubmitted — skip
          if (si === 3) continue;

          // Student C (index 2) only submits assignment 1
          if (si === 2 && assignNo === 2) continue;

          const existing = await ctx.db
            .query("submissions")
            .withIndex("by_assignment_and_student", (q) =>
              q.eq("assignmentId", assignmentId).eq("studentUserId", studentId),
            )
            .first();
          if (existing) continue;

          type SubInsert = {
            assignmentId: Id<"assignments">;
            studentUserId: Id<"users">;
            fileName: string;
            submittedAt: number;
            mark?: number;
            feedback?: string;
            gradedAt?: number;
            gradedByUserId?: Id<"users">;
            isReleased?: boolean;
          };

          const payload: SubInsert = {
            assignmentId,
            studentUserId: studentId,
            fileName: `g${n}_maths_assign${assignNo}_student${si + 1}.pdf`,
            submittedAt: now - 5 * DAY,
          };

          // Student A (index 0): graded at 67%, released
          if (si === 0) {
            payload.mark = MARK_67;
            payload.feedback = "Good work. Review Chapter 3 on factorisation for stronger results.";
            payload.gradedAt = now - 3 * DAY;
            payload.gradedByUserId = mathTeacherId;
            payload.isReleased = true;
          }
          // Students B (index 1) and C (index 2): submitted but not yet marked

          await ctx.db.insert("submissions", payload);
        }
      }
    }

    return {
      message: "✅ Academic seed complete",
      summary: {
        grades: GRADES,
        studentsCreated: studentDefs.length,
        englishCoursesCreated: GRADES.length,
        mathsCoursesCreated: GRADES.length,
        quizzesPerGrade: 2,
        assignmentsPerGrade: 2,
        perGradePattern: {
          english: "Students A-C completed both quizzes (80%); Student D not started",
          maths: "Student A: graded at 67%; Student B: submitted, not marked; Student C: submit assign 1 only; Student D: unsubmitted",
        },
      },
    };
  },
});

/**
 * Reassigns the Grade 8 and Grade 9 English + Maths courses to the
 * lgumbi2169+teacher@gmail.com account (Alex Dlamini).
 * Creates a teacher profile for that account if one doesn't exist yet.
 * Safe to run multiple times.
 */
export const assignAlexToGrade8And9 = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const teacher = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "lgumbi2169+teacher@gmail.com"))
      .first();

    if (!teacher) {
      throw new Error("Teacher account lgumbi2169+teacher@gmail.com not found. Run seedTestUsers first.");
    }

    let profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", teacher._id))
      .first();

    if (!profile) {
      const pid = await ctx.db.insert("teacherProfiles", {
        userId: teacher._id,
        employeeNumber: "EMP-001",
        qualificationText: "B.Ed (Hons)",
        createdAt: now,
        updatedAt: now,
      });
      profile = (await ctx.db.get(pid))!;
    }

    const targetCodes = ["ENG-G8", "ENG-G9", "MATH-G8", "MATH-G9"];
    const updated: string[] = [];

    for (const code of targetCodes) {
      const course = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", code))
        .first();

      if (!course) {
        updated.push(`${code}: not found (run seedAcademicData first)`);
        continue;
      }

      await ctx.db.patch(course._id, { teacherProfileId: profile._id, updatedAt: now });
      updated.push(`${code}: assigned to ${teacher.fullName ?? teacher.email}`);
    }

    return { message: "✅ Done", updated };
  },
});
