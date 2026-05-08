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
 *   Teacher  → teacher1@learnmanage.dev   / TeachPass@2025!
 *   Student  → student1@learnmanage.dev   / StudyPass@2025!
 *   Parent   → parent1@learnmanage.dev    / ParentPass@2025!
 *
 * Roles are bootstrapped automatically by email on Clerk signup
 * (see BOOTSTRAP_* sets in users.ts).
 */

import { v } from "convex/values";
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
      email: "teacher1@learnmanage.dev",
      fullName: "Alex Dlamini",
      firstName: "Alex",
      lastName: "Dlamini",
      role: "teacher",
    });

    const studentId = await upsertUser({
      email: "student1@learnmanage.dev",
      fullName: "Test Student",
      firstName: "Test",
      lastName: "Mokoena",
      role: "student",
    });

    const parentId = await upsertUser({
      email: "parent1@learnmanage.dev",
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
          email: "teacher1@learnmanage.dev",
          password: "TeachPass@2025!",
          role: "teacher",
          name: "Alex Dlamini",
        },
        student: {
          email: "student1@learnmanage.dev",
          password: "StudyPass@2025!",
          role: "student",
          name: "Test Student",
          enrolledIn: course.courseName,
        },
        parent: {
          email: "parent1@learnmanage.dev",
          password: "ParentPass@2025!",
          role: "parent",
          name: "Bongiwe Mokoena",
          linkedTo: "Test Student (student)",
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
 * teacher1@learnmanage.dev account (Alex Dlamini).
 * Creates a teacher profile for that account if one doesn't exist yet.
 * Safe to run multiple times.
 */
export const assignAlexToGrade8And9 = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const teacher = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "teacher1@learnmanage.dev"))
      .first();

    if (!teacher) {
      throw new Error("Teacher account teacher1@learnmanage.dev not found. Run seedTestUsers first.");
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

/**
 * Sets up a specific user as a Grade 8 learner and enrolls them in
 * Grade 8 English and Mathematics.
 */
export const setupGrade8Learner = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.email.toLowerCase();

    // 1. Find the user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      // Create user if not exists (placeholder)
      const userId = await ctx.db.insert("users", {
        clerkUserId: `seed_placeholder_student_${Date.now()}`,
        email: normalizedEmail,
        firstName: "Seeded",
        lastName: "Student",
        fullName: "Seeded Student",
        role: "student",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.get(userId))!;
    } else {
      // Update role to student
      await ctx.db.patch(user._id, { role: "student", updatedAt: now });
    }

    // 2. Setup Student Profile
    const existingProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user!._id))
      .first();

    if (!existingProfile) {
      await ctx.db.insert("studentProfiles", {
        userId: user._id,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, {
        updatedAt: now,
      });
    }

    // 3. Enroll in Grade 8 subjects
    const targetCodes = ["ENG-G8", "MATH-G8"];
    const enrollmentSummary: string[] = [];

    for (const code of targetCodes) {
      const course = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", code))
        .first();

      if (!course) {
        enrollmentSummary.push(`${code}: course not found`);
        continue;
      }

      // Check for existing enrollment
      const existingEnrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", user!._id))
        .collect();
      
      const alreadyEnrolled = existingEnrollment.some(e => e.courseId === course._id);

      if (!alreadyEnrolled) {
        // Create a dummy application for the enrollment
        const appId = await ctx.db.insert("enrollmentApplications", {
          studentUserId: user._id,
          gradeLabel: "Grade 8",
          selectedCourseIds: [course._id],
          status: "approved",
          paymentStatus: "paid",
          notes: "Auto-enrolled via setupGrade8Learner.",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("enrollments", {
          studentUserId: user._id,
          courseId: course._id,
          applicationId: appId,
          enrolledAt: now,
          status: "active",
        });
        enrollmentSummary.push(`${code}: enrolled`);
      } else {
        enrollmentSummary.push(`${code}: already enrolled`);
      }
    }

    return {
      success: true,
      user: user.email,
      enrollments: enrollmentSummary,
    };
  },
});

/**
 * Seeds two showcase quizzes:
 *   1. COMPLETE published English quiz  (5 Qs, 10 marks, ready for students)
 *   2. INCOMPLETE draft Maths test      (2 of 10 Qs, teacher mid-way)
 *
 * Run seedTestUsers + seedAcademicData first.  Idempotent.
 */
export const seedDemoQuizzes = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const teacher = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "teacher1@learnmanage.dev"))
      .first();
    if (!teacher) throw new Error("Run seedTestUsers first.");

    const engCourse = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", "ENG-G8"))
      .first();
    if (!engCourse) throw new Error("Run seedAcademicData first — ENG-G8 not found.");

    const mathCourse = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", "MATH-G8"))
      .first();
    if (!mathCourse) throw new Error("Run seedAcademicData first — MATH-G8 not found.");

    // ── 1. Complete published quiz ──────────────────────────────────────────
    const COMPLETE_TITLE = "Poetry & Figurative Language";
    const allEngQuizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", engCourse._id))
      .collect();

    if (!allEngQuizzes.find((q) => q.title === COMPLETE_TITLE)) {
      const completeId = await ctx.db.insert("quizzes", {
        courseId: engCourse._id,
        title: COMPLETE_TITLE,
        description: "Covers simile, metaphor, personification, alliteration and hyperbole. 5 questions · 10 marks.",
        maxAttempts: 2,
        durationMinutes: 15,
        startsAt: now - 7 * DAY,
        endsAt: now + 14 * DAY,
        status: "published",
        createdByUserId: teacher._id,
        createdAt: now - 7 * DAY,
      });

      const qs = [
        { prompt: "Which sentence contains a simile?", options: ["The wind howled all night.", "Her smile was sunshine.", "He ran as fast as a cheetah.", "The car ate the miles."], correctAnswer: "He ran as fast as a cheetah.", weighting: 2 },
        { prompt: '"The classroom was a zoo." — What figure of speech is this?', options: ["Simile", "Personification", "Metaphor", "Alliteration"], correctAnswer: "Metaphor", weighting: 2 },
        { prompt: "Which of the following is an example of personification?", options: ["The stars twinkled brightly.", "The stars danced across the sky.", "The stars were like diamonds.", "The night sky was dark."], correctAnswer: "The stars danced across the sky.", weighting: 2 },
        { prompt: '"Peter Piper picked a peck of pickled peppers." — This is:', options: ["Hyperbole", "Alliteration", "Onomatopoeia", "Assonance"], correctAnswer: "Alliteration", weighting: 2 },
        { prompt: '"I\'ve told you a million times!" — What figure of speech is this?', options: ["Metaphor", "Simile", "Hyperbole", "Personification"], correctAnswer: "Hyperbole", weighting: 2 },
      ];
      for (let i = 0; i < qs.length; i++) {
        await ctx.db.insert("questions", { quizId: completeId, ...qs[i], position: i + 1 });
      }
    }

    // ── 2. Incomplete draft test ────────────────────────────────────────────
    const DRAFT_TITLE = "Chapter 2: Algebra — Test";
    const allMathQuizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", mathCourse._id))
      .collect();

    if (!allMathQuizzes.find((q) => q.title === DRAFT_TITLE)) {
      const draftId = await ctx.db.insert("quizzes", {
        courseId: mathCourse._id,
        title: DRAFT_TITLE,
        description: "Algebraic expressions, simplification and substitution. Target: 10 Qs · 20 marks. In progress — 2 of 10 questions added.",
        maxAttempts: 1,
        durationMinutes: 30,
        status: "draft",
        createdByUserId: teacher._id,
        createdAt: now - 2 * DAY,
      });

      // Teacher has only added 2 so far
      const draftQs = [
        { prompt: "Simplify: 3x + 2x", options: ["5x", "6x", "5x²", "x⁵"], correctAnswer: "5x", weighting: 2 },
        { prompt: "If x = 4, what is the value of 2x − 3?", options: ["5", "8", "11", "6"], correctAnswer: "5", weighting: 2 },
      ];
      for (let i = 0; i < draftQs.length; i++) {
        await ctx.db.insert("questions", { quizId: draftId, ...draftQs[i], position: i + 1 });
      }
    }

    return {
      message: "✅ Demo quizzes seeded",
      complete: COMPLETE_TITLE + " (published, 5 Qs)",
      draft: DRAFT_TITLE + " (draft, 2/10 Qs — in progress)",
    };
  },
});

/**
 * Seeds 22148086@outlook.com as a Grade 9 student.
 * Enrolls them in ENG-G9 and MATH-G9, then generates realistic
 * quiz attempts and assignment submissions for both subjects.
 *
 * Run seedAcademicData first.  Idempotent.
 */
export const seedOutlookStudent = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // ── 1. Upsert the student user ─────────────────────────────────────────
    const EMAIL = "22148086@outlook.com";
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", EMAIL))
      .first();

    let studentId: Id<"users">;
    if (existing) {
      if (existing.role !== "student") {
        await ctx.db.patch(existing._id, { role: "student", updatedAt: now });
      }
      studentId = existing._id;
    } else {
      studentId = await ctx.db.insert("users", {
        clerkUserId: `seed_student_${EMAIL.replace(/[^a-z0-9]/gi, "_")}`,
        email: EMAIL,
        firstName: "Test",
        lastName: "Student",
        fullName: "Test Student",
        role: "student",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── 2. Fetch Grade 9 courses ───────────────────────────────────────────
    const engCourse = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", "ENG-G9"))
      .first();
    if (!engCourse) throw new Error("ENG-G9 not found — run seedAcademicData first.");

    const mathCourse = await ctx.db
      .query("courses")
      .withIndex("by_course_code", (q) => q.eq("courseCode", "MATH-G9"))
      .first();
    if (!mathCourse) throw new Error("MATH-G9 not found — run seedAcademicData first.");

    // ── 3. Enroll in both courses ──────────────────────────────────────────
    async function ensureEnrollment(courseId: Id<"courses">) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", studentId))
        .collect();
      if (enrollments.some((e) => e.courseId === courseId)) return;
      const appId = await ctx.db.insert("enrollmentApplications", {
        studentUserId: studentId,
        selectedCourseIds: [courseId],
        status: "approved",
        paymentStatus: "paid",
        notes: "Seeded by seedOutlookStudent.",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("enrollments", {
        studentUserId: studentId,
        courseId,
        applicationId: appId,
        enrolledAt: now,
        status: "active",
      });
    }

    await ensureEnrollment(engCourse._id);
    await ensureEnrollment(mathCourse._id);

    // ── 4. English quiz attempts ───────────────────────────────────────────
    // Complete both Term 1 and Term 2 quizzes with 80% (8/10)
    const engQuizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", engCourse._id))
      .collect();

    let engAttemptsSeeded = 0;
    for (const quiz of engQuizzes) {
      if (quiz.status !== "published") continue;

      const alreadyAttempted = await ctx.db
        .query("quizAttempts")
        .withIndex("by_quiz_and_student", (q) =>
          q.eq("quizId", quiz._id).eq("studentUserId", studentId),
        )
        .first();
      if (alreadyAttempted) continue;

      const questions = await ctx.db
        .query("questions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
        .collect();
      if (questions.length === 0) continue;

      const sorted = questions.sort((a, b) => a.position - b.position);
      // Get the last question wrong for 80% (4/5 correct)
      const answers = sorted.map((q, idx) => ({
        questionId: q._id,
        answer: idx === sorted.length - 1 ? q.options[0] : q.correctAnswer,
      }));

      const totalWeight = sorted.reduce((s, q) => s + q.weighting, 0);
      const correctWeight = sorted.slice(0, sorted.length - 1).reduce((s, q) => s + q.weighting, 0);

      await ctx.db.insert("quizAttempts", {
        quizId: quiz._id,
        studentUserId: studentId,
        answers,
        score: correctWeight,
        maxScore: totalWeight,
        submittedAt: now - 6 * DAY,
      });
      engAttemptsSeeded++;
    }

    // ── 5. Maths assignment submissions ───────────────────────────────────
    // Assignment 1: submitted and graded at 74%
    // Assignment 2: submitted, not yet marked
    const mathAssignments = (await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", mathCourse._id))
      .collect()
    ).sort((a, b) => a.createdAt - b.createdAt);

    // Resolve the maths teacher for grading
    const mathTeacherUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "seed+math.teacher@learnmanage.dev"))
      .first();

    let mathSubsSeeded = 0;
    for (let i = 0; i < mathAssignments.length; i++) {
      const assignment = mathAssignments[i];
      const alreadySubmitted = await ctx.db
        .query("submissions")
        .withIndex("by_assignment_and_student", (q) =>
          q.eq("assignmentId", assignment._id).eq("studentUserId", studentId),
        )
        .first();
      if (alreadySubmitted) continue;

      const maxMark = assignment.maxMark ?? 50;

      if (i === 0) {
        // Assignment 1: graded at 74%
        await ctx.db.insert("submissions", {
          assignmentId: assignment._id,
          studentUserId: studentId,
          fileName: "g9_maths_assign1_22148086.pdf",
          submittedAt: now - 8 * DAY,
          mark: Math.round(maxMark * 0.74),
          feedback: "Good understanding of algebraic expressions. Work on showing more steps in your factorisation.",
          gradedAt: now - 5 * DAY,
          gradedByUserId: mathTeacherUser?._id,
          isReleased: true,
        });
      } else {
        // Assignment 2: submitted, awaiting marking
        await ctx.db.insert("submissions", {
          assignmentId: assignment._id,
          studentUserId: studentId,
          fileName: "g9_maths_assign2_22148086.pdf",
          submittedAt: now - 2 * DAY,
        });
      }
      mathSubsSeeded++;
    }

    return {
      message: "✅ Student seeded",
      student: EMAIL,
      grade: "Grade 9",
      coursesEnrolled: ["ENG-G9", "MATH-G9"],
      englishQuizAttempts: engAttemptsSeeded,
      mathsSubmissions: mathSubsSeeded,
    };
  },
});

/**
 * Seeds published final marks for all enrolled students across all courses.
 * Parents will immediately see their child's report once this runs.
 * Generates realistic marks spread across the achievement band (40%–90%).
 * Idempotent — skips students that already have a published finalMark for a course.
 */
export const seedFinalMarks = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Deterministic "random" mark from a student+course seed
    function deterministicMark(seed: string): number {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
      }
      // Map to 40–90 range
      const norm = (Math.abs(hash) % 1000) / 1000;
      return Math.round(40 + norm * 50);
    }

    // Get all courses
    const courses = await ctx.db.query("courses").take(50);
    const summary: string[] = [];
    let seeded = 0;
    let skipped = 0;

    for (const course of courses) {
      // Get all active enrollments for this course
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

      for (const enrollment of enrollments) {
        if (enrollment.status !== "active") continue;

        const studentUserId = enrollment.studentUserId;

        // Check if a final mark already exists
        const existing = await ctx.db
          .query("finalMarks")
          .withIndex("by_course_and_student", (q) =>
            q.eq("courseId", course._id).eq("studentUserId", studentUserId),
          )
          .first();

        if (existing?.status === "published") {
          skipped++;
          continue;
        }

        // Generate a realistic mark
        const seed = `${String(studentUserId)}-${String(course._id)}`;
        const mark = deterministicMark(seed);

        const payload = {
          courseId: course._id,
          studentUserId,
          computedAssignmentPercent: mark,
          computedQuizPercent: mark + (deterministicMark(seed + "q") % 10) - 5,
          computedFinalMark: mark,
          notes: `Term report — ${course.courseName}.`,
          status: "published" as const,
          updatedAt: now,
          publishedAt: now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        } else {
          await ctx.db.insert("finalMarks", payload);
        }

        seeded++;
      }
    }

    summary.push(`Published ${seeded} final marks across ${courses.length} courses.`);
    summary.push(`Skipped ${skipped} already-published marks.`);

    return { success: true, seeded, skipped, summary };
  },
});

/**
 * Links a parent to a student by email. Idempotent — won't create duplicates.
 * Also ensures the parent's role is "parent" and the student's role is "student".
 */
export const linkParentToStudent = mutation({
  args: {
    parentEmail: v.string(),
    studentEmail: v.string(),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const parent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.parentEmail.toLowerCase()))
      .first();
    if (!parent) throw new Error(`Parent not found: ${args.parentEmail}`);

    const student = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.studentEmail.toLowerCase()))
      .first();
    if (!student) throw new Error(`Student not found: ${args.studentEmail}`);

    // Ensure correct roles
    if (parent.role !== "parent") {
      await ctx.db.patch(parent._id, { role: "parent", updatedAt: now });
    }
    if (student.role !== "student") {
      await ctx.db.patch(student._id, { role: "student", updatedAt: now });
    }

    // Check for an existing link (avoid duplicates)
    const existingLinks = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .collect();

    const alreadyLinked = existingLinks.some((l) => l.studentId === student._id);

    if (!alreadyLinked) {
      await ctx.db.insert("parentStudentLinks", {
        parentId: parent._id,
        studentId: student._id,
        relationship: args.relationship ?? "Parent",
        createdAt: now,
      });
    }

    return {
      success: true,
      linked: !alreadyLinked,
      parent: { email: parent.email, role: "parent" },
      student: { email: student.email, role: "student" },
      message: alreadyLinked
        ? "Link already exists — no changes made."
        : `✅ ${args.parentEmail} is now linked as parent of ${args.studentEmail}.`,
    };
  },
});

// ── SA CAPS full subject list + complete timetable for all grades ─────────────
// Run this AFTER seedAcademicData to create all remaining subjects,
// enrol seeded students, and generate a Mon-Fri timetable.
// Grade 8/9: all 9 Senior Phase subjects (compulsory)
// Grade 10/11/12: 4 core + 7 electives seeded (students only see their enrolled ones)
export const seedAllSubjectsAndTimetable = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // ── helpers ────────────────────────────────────────────────────────────
    async function upsertUser(params: {
      email: string; fullName: string; firstName: string; lastName: string;
      role: "teacher" | "student" | "parent";
    }) {
      const existing = await ctx.db
        .query("users").withIndex("by_email", (q) => q.eq("email", params.email)).first();
      if (existing) return existing._id;
      return ctx.db.insert("users", {
        clerkUserId: `seed_${params.role}_${params.email.replace(/[^a-z0-9]/gi, "_")}`,
        email: params.email, firstName: params.firstName, lastName: params.lastName,
        fullName: params.fullName, role: params.role, isActive: true, createdAt: now, updatedAt: now,
      });
    }

    async function upsertTeacherProfile(userId: Id<"users">, employeeNumber: string) {
      const existing = await ctx.db
        .query("teacherProfiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).first();
      if (existing) return existing._id;
      return ctx.db.insert("teacherProfiles", {
        userId, employeeNumber, qualificationText: "B.Ed (Hons)", createdAt: now, updatedAt: now,
      });
    }

    async function upsertCourse(params: {
      courseCode: string; courseName: string; department: string;
      teacherProfileId: Id<"teacherProfiles">;
    }) {
      const existing = await ctx.db
        .query("courses").withIndex("by_course_code", (q) => q.eq("courseCode", params.courseCode)).first();
      if (existing) return existing._id;
      return ctx.db.insert("courses", {
        ...params, description: `${params.courseName} curriculum.`,
        semester: 1, isPublished: true, assignmentWeight: 50, quizWeight: 50,
        createdAt: now, updatedAt: now,
      });
    }

    async function ensureEnrollment(studentUserId: Id<"users">, courseId: Id<"courses">) {
      const enrollments = await ctx.db
        .query("enrollments").withIndex("by_student", (q) => q.eq("studentUserId", studentUserId)).collect();
      if (enrollments.some((e) => e.courseId === courseId)) return;
      const appId = await ctx.db.insert("enrollmentApplications", {
        studentUserId, selectedCourseIds: [courseId], status: "approved", paymentStatus: "paid",
        notes: "Seeded by seedAllSubjectsAndTimetable.", createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("enrollments", {
        studentUserId, courseId, applicationId: appId, enrolledAt: now, status: "active",
      });
    }

    async function upsertTimetableSlot(params: {
      courseId: Id<"courses">; dayOfWeek: number; startHour: number; startMinute: number;
      durationMinutes: number; deliveryMode: "online" | "in_person";
      venue?: string; meetingUrl?: string;
    }) {
      // Avoid duplicates (same course + day + start time)
      const existing = await ctx.db
        .query("timetable").withIndex("by_course", (q) => q.eq("courseId", params.courseId))
        .filter((q) =>
          q.and(
            q.eq(q.field("dayOfWeek"), params.dayOfWeek),
            q.eq(q.field("startHour"), params.startHour),
            q.eq(q.field("startMinute"), params.startMinute),
          ),
        ).first();
      if (existing) return;
      await ctx.db.insert("timetable", { ...params, isActive: true, createdAt: now });
    }

    // ── teachers for new subjects ─────────────────────────────────────────
    const scienceTeacherId = await upsertUser({
      email: "seed+science.teacher@learnmanage.dev",
      fullName: "Dr. Nomsa Dlamini", firstName: "Nomsa", lastName: "Dlamini", role: "teacher",
    });
    const humanitiesTeacherId = await upsertUser({
      email: "seed+humanities.teacher@learnmanage.dev",
      fullName: "Mr. Thabo Zulu", firstName: "Thabo", lastName: "Zulu", role: "teacher",
    });
    const commerceTeacherId = await upsertUser({
      email: "seed+commerce.teacher@learnmanage.dev",
      fullName: "Ms. Zanele Mthembu", firstName: "Zanele", lastName: "Mthembu", role: "teacher",
    });
    const lifeSkillsTeacherId = await upsertUser({
      email: "seed+lifeskills.teacher@learnmanage.dev",
      fullName: "Ms. Patricia Nkosi", firstName: "Patricia", lastName: "Nkosi", role: "teacher",
    });
    const scienceProfileId   = await upsertTeacherProfile(scienceTeacherId,    "EMP-SCI-001");
    const humanitiesProfileId = await upsertTeacherProfile(humanitiesTeacherId, "EMP-HUM-001");
    const commerceProfileId  = await upsertTeacherProfile(commerceTeacherId,   "EMP-COM-001");
    const lifeSkillsProfileId = await upsertTeacherProfile(lifeSkillsTeacherId, "EMP-LO-001");

    const GRADES = ["8", "9", "10", "11", "12"];

    // ── subject definitions per phase ────────────────────────────────────
    type SubjectDef = { code: string; name: string; dept: string; profileId: Id<"teacherProfiles"> };

    const seniorSubjects = (n: string): SubjectDef[] => [
      { code: `FAL-G${n}`,  name: `Afrikaans First Additional Language Grade ${n}`,  dept: "Languages",   profileId: lifeSkillsProfileId },
      { code: `NS-G${n}`,   name: `Natural Sciences Grade ${n}`,                      dept: "Sciences",    profileId: scienceProfileId },
      { code: `SS-G${n}`,   name: `Social Sciences Grade ${n}`,                       dept: "Humanities",  profileId: humanitiesProfileId },
      { code: `TECH-G${n}`, name: `Technology Grade ${n}`,                            dept: "Technology",  profileId: scienceProfileId },
      { code: `EMS-G${n}`,  name: `Economic and Management Sciences Grade ${n}`,      dept: "Commerce",    profileId: commerceProfileId },
      { code: `LO-G${n}`,   name: `Life Orientation Grade ${n}`,                      dept: "Life Skills", profileId: lifeSkillsProfileId },
      { code: `CA-G${n}`,   name: `Creative Arts Grade ${n}`,                         dept: "Arts",        profileId: lifeSkillsProfileId },
    ];

    const fetSubjects = (n: string): SubjectDef[] => [
      { code: `FAL-G${n}`,  name: `Afrikaans First Additional Language Grade ${n}`, dept: "Languages",    profileId: lifeSkillsProfileId },
      { code: `LO-G${n}`,   name: `Life Orientation Grade ${n}`,                   dept: "Life Skills",  profileId: lifeSkillsProfileId },
      { code: `PS-G${n}`,   name: `Physical Sciences Grade ${n}`,                  dept: "Sciences",     profileId: scienceProfileId },
      { code: `LS-G${n}`,   name: `Life Sciences Grade ${n}`,                      dept: "Sciences",     profileId: scienceProfileId },
      { code: `ACC-G${n}`,  name: `Accounting Grade ${n}`,                         dept: "Commerce",     profileId: commerceProfileId },
      { code: `BS-G${n}`,   name: `Business Studies Grade ${n}`,                   dept: "Commerce",     profileId: commerceProfileId },
      { code: `ECO-G${n}`,  name: `Economics Grade ${n}`,                          dept: "Commerce",     profileId: commerceProfileId },
      { code: `HIST-G${n}`, name: `History Grade ${n}`,                            dept: "Humanities",   profileId: humanitiesProfileId },
      { code: `GEO-G${n}`,  name: `Geography Grade ${n}`,                          dept: "Humanities",   profileId: humanitiesProfileId },
    ];

    // ── create courses + enroll seeded students ───────────────────────────
    // courseId map: code → id
    const courseIds: Record<string, Id<"courses">> = {};

    // Look up existing seeded students by email
    async function getStudentId(email: string) {
      const user = await ctx.db
        .query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
      return user?._id ?? null;
    }

    const studentsByGrade: Record<string, (Id<"users"> | null)[]> = {
      "8":  await Promise.all(["seed+g8.amahle@learnmanage.dev","seed+g8.lindo@learnmanage.dev","seed+g8.nomsa@learnmanage.dev","seed+g8.thabo@learnmanage.dev", "siphokazimasuku281@gmail.com"].map(getStudentId)),
      "9":  await Promise.all(["seed+g9.zanele@learnmanage.dev","seed+g9.mpho@learnmanage.dev","seed+g9.bongani@learnmanage.dev","seed+g9.siyanda@learnmanage.dev"].map(getStudentId)),
      "10": await Promise.all(["seed+g10.lerato@learnmanage.dev","seed+g10.sipho@learnmanage.dev","seed+g10.nomvula@learnmanage.dev","seed+g10.ayanda@learnmanage.dev", "thomasmkhasibe10@gmail.com"].map(getStudentId)),
      "11": await Promise.all(["seed+g11.khanya@learnmanage.dev","seed+g11.nandi@learnmanage.dev","seed+g11.thandeka@learnmanage.dev","seed+g11.sbusiso@learnmanage.dev"].map(getStudentId)),
      "12": await Promise.all(["seed+g12.palesa@learnmanage.dev","seed+g12.siphamandla@learnmanage.dev","seed+g12.nokwanda@learnmanage.dev","seed+g12.lungelo@learnmanage.dev"].map(getStudentId)),
    };

    for (const n of GRADES) {
      const subjects = n === "8" || n === "9" ? seniorSubjects(n) : fetSubjects(n);
      for (const subj of subjects) {
        const cid = await upsertCourse({ courseCode: subj.code, courseName: subj.name, department: subj.dept, teacherProfileId: subj.profileId });
        courseIds[subj.code] = cid;

        // Enroll all seeded students in this grade
        for (const studentId of studentsByGrade[n] ?? []) {
          if (studentId) await ensureEnrollment(studentId, cid);
        }
      }
    }

    // ── timetable slots ───────────────────────────────────────────────────
    // P1=07:30, P2=08:30, P3=09:30, P4=11:00, P5=12:00, P6=13:40, P7=14:40
    // Delivery: IP=in_person, OL=online
    type RawSlot = {
      code: string; day: number; h: number; m: number;
      mode: "online" | "in_person"; venue?: string; url?: string;
    };

    const IP = (venue: string) => ({ mode: "in_person" as const, venue });
    const OL = (url: string)   => ({ mode: "online"    as const, url });

    // ── Grade 8/9 Senior Phase: no conflicts for any student (all take all 9) ──
    const SENIOR_SLOTS: RawSlot[] = [
      // MATH P1 daily (existing course, skip — already handled by seedTimetable)
      // but we re-seed here for completeness (upsert deduplicates)
      { code:"MATH", day:1, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:2, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:3, h:7,  m:30, ...OL("https://meet.google.com/math") },
      { code:"MATH", day:4, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:5, h:7,  m:30, ...OL("https://meet.google.com/math") },
      // ENG P2 daily
      { code:"ENG",  day:1, h:8,  m:30, ...OL("https://meet.google.com/eng") },
      { code:"ENG",  day:2, h:8,  m:30, ...IP("English Room B") },
      { code:"ENG",  day:3, h:8,  m:30, ...OL("https://meet.google.com/eng") },
      { code:"ENG",  day:4, h:8,  m:30, ...IP("English Room B") },
      { code:"ENG",  day:5, h:8,  m:30, ...IP("English Room B") },
      // FAL P3 daily
      { code:"FAL",  day:1, h:9,  m:30, ...IP("Language Lab") },
      { code:"FAL",  day:2, h:9,  m:30, ...OL("https://meet.google.com/fal") },
      { code:"FAL",  day:3, h:9,  m:30, ...IP("Language Lab") },
      { code:"FAL",  day:4, h:9,  m:30, ...OL("https://meet.google.com/fal") },
      { code:"FAL",  day:5, h:9,  m:30, ...IP("Language Lab") },
      // NS  P4 Mon/Wed/Fri
      { code:"NS",   day:1, h:11, m:0,  ...IP("Science Lab") },
      { code:"NS",   day:3, h:11, m:0,  ...OL("https://meet.google.com/ns") },
      { code:"NS",   day:5, h:11, m:0,  ...IP("Science Lab") },
      // SS  P4 Tue/Thu + P5 Wed
      { code:"SS",   day:2, h:11, m:0,  ...IP("Room 204") },
      { code:"SS",   day:4, h:11, m:0,  ...IP("Room 204") },
      { code:"SS",   day:3, h:12, m:0,  ...OL("https://meet.google.com/ss") },
      // TECH P5 Mon/Fri + P6 Thu
      { code:"TECH", day:1, h:12, m:0,  ...IP("Tech Lab") },
      { code:"TECH", day:5, h:12, m:0,  ...IP("Tech Lab") },
      { code:"TECH", day:4, h:13, m:40, ...OL("https://meet.google.com/tech") },
      // EMS  P5 Tue/Thu + P6 Fri
      { code:"EMS",  day:2, h:12, m:0,  ...OL("https://meet.google.com/ems") },
      { code:"EMS",  day:4, h:12, m:0,  ...IP("Room 206") },
      { code:"EMS",  day:5, h:13, m:40, ...OL("https://meet.google.com/ems") },
      // CA   P6 Tue/Wed
      { code:"CA",   day:2, h:13, m:40, ...IP("Arts Room") },
      { code:"CA",   day:3, h:13, m:40, ...OL("https://meet.google.com/ca") },
      // LO   P7 Mon + P7 Wed
      { code:"LO",   day:1, h:14, m:40, ...IP("Main Hall") },
      { code:"LO",   day:3, h:14, m:40, ...OL("https://meet.google.com/lo") },
    ];

    // ── Grade 10-12 FET Phase ────────────────────────────────────────────────
    // Core runs at same periods as Senior Phase.
    // Electives are scheduled in P4-P7; parallel slots are normal school practice.
    // Students only see subjects they're enrolled in.
    const FET_SLOTS: RawSlot[] = [
      // MATH P1 daily
      { code:"MATH", day:1, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:2, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:3, h:7,  m:30, ...OL("https://meet.google.com/math") },
      { code:"MATH", day:4, h:7,  m:30, ...IP("Maths Room 101") },
      { code:"MATH", day:5, h:7,  m:30, ...OL("https://meet.google.com/math") },
      // ENG P2 daily
      { code:"ENG",  day:1, h:8,  m:30, ...OL("https://meet.google.com/eng") },
      { code:"ENG",  day:2, h:8,  m:30, ...IP("English Room B") },
      { code:"ENG",  day:3, h:8,  m:30, ...OL("https://meet.google.com/eng") },
      { code:"ENG",  day:4, h:8,  m:30, ...IP("English Room B") },
      { code:"ENG",  day:5, h:8,  m:30, ...IP("English Room B") },
      // FAL P3 daily
      { code:"FAL",  day:1, h:9,  m:30, ...IP("Language Lab") },
      { code:"FAL",  day:2, h:9,  m:30, ...OL("https://meet.google.com/fal") },
      { code:"FAL",  day:3, h:9,  m:30, ...IP("Language Lab") },
      { code:"FAL",  day:4, h:9,  m:30, ...OL("https://meet.google.com/fal") },
      { code:"FAL",  day:5, h:9,  m:30, ...IP("Language Lab") },
      // LO  P7 Tue/Thu (compulsory, 2×/week — no electives run Tue/Thu P7)
      { code:"LO",   day:2, h:14, m:40, ...IP("Main Hall") },
      { code:"LO",   day:4, h:14, m:40, ...OL("https://meet.google.com/lo") },
      // SCIENCES (P4): PS Mon/Wed/Fri, LS Tue/Thu + Wed P5
      { code:"PS",   day:1, h:11, m:0,  ...IP("Physics Lab") },
      { code:"PS",   day:3, h:11, m:0,  ...OL("https://meet.google.com/ps") },
      { code:"PS",   day:5, h:11, m:0,  ...IP("Physics Lab") },
      { code:"LS",   day:2, h:11, m:0,  ...IP("Biology Lab") },
      { code:"LS",   day:4, h:11, m:0,  ...OL("https://meet.google.com/ls") },
      { code:"LS",   day:3, h:12, m:0,  ...IP("Biology Lab") },
      // COMMERCE (P5): ACC Mon/Wed/Fri, BS Tue/Thu + Fri P6
      { code:"ACC",  day:1, h:12, m:0,  ...IP("Room 301") },
      { code:"ACC",  day:3, h:12, m:0,  ...OL("https://meet.google.com/acc") },
      { code:"ACC",  day:5, h:12, m:0,  ...IP("Room 301") },
      { code:"BS",   day:2, h:12, m:0,  ...OL("https://meet.google.com/bs") },
      { code:"BS",   day:4, h:12, m:0,  ...IP("Room 302") },
      { code:"BS",   day:5, h:13, m:40, ...IP("Room 302") },
      // ECONOMICS: Mon/Tue/Thu P6
      { code:"ECO",  day:1, h:13, m:40, ...OL("https://meet.google.com/eco") },
      { code:"ECO",  day:2, h:13, m:40, ...IP("Room 303") },
      { code:"ECO",  day:4, h:13, m:40, ...IP("Room 303") },
      // HUMANITIES (P6/P7): HIST Mon/Wed/Fri P7, GEO Mon/Wed/Fri P6 (parallel with ECO; different students)
      { code:"HIST", day:1, h:14, m:40, ...IP("Room 401") },
      { code:"HIST", day:3, h:14, m:40, ...OL("https://meet.google.com/hist") },
      { code:"HIST", day:5, h:14, m:40, ...IP("Room 401") },
      { code:"GEO",  day:3, h:13, m:40, ...IP("Room 402") },
      { code:"GEO",  day:4, h:13, m:40, ...OL("https://meet.google.com/geo") },
      { code:"GEO",  day:5, h:14, m:40, ...OL("https://meet.google.com/geo") },
    ];

    // ── write timetable slots ─────────────────────────────────────────────
    let timetableCreated = 0;
    for (const n of GRADES) {
      const rawSlots = n === "8" || n === "9" ? SENIOR_SLOTS : FET_SLOTS;
      for (const slot of rawSlots) {
        const codeWithGrade = `${slot.code}-G${n}`;
        const courseId = courseIds[codeWithGrade] ??
          (await ctx.db.query("courses")
            .withIndex("by_course_code", (q) => q.eq("courseCode", codeWithGrade)).first())?._id;
        if (!courseId) continue;
        await upsertTimetableSlot({
          courseId,
          dayOfWeek: slot.day,
          startHour: slot.h,
          startMinute: slot.m,
          durationMinutes: 50,
          deliveryMode: slot.mode,
          venue: slot.venue,
          meetingUrl: slot.url,
        });
        timetableCreated++;
      }
    }

    return { coursesCreated: Object.keys(courseIds).length, timetableCreated };
  },
});

/**
 * Seeds behaviour records for Grade 8 and Grade 9 students.
 * - 3-5 merits per student
 * - 1-2 demerits per student
 * - Spread across the past 30 days
 * - Awarded by the existing seeded teacher (Alex Dlamini)
 */
export const seedBehaviourRecords = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const teacher = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "teacher1@learnmanage.dev"))
      .first();

    if (!teacher) {
      throw new Error("Teacher account not found. Run seedTestUsers first.");
    }

    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    // Filter to just grade 8 and 9 (using the emails we used in seedAcademicData) and our two specific students
    const targetStudents = students.filter((s) => 
      s.email.includes("+g8.") || s.email.includes("+g9.") ||
      s.email === "siphokazimasuku281@gmail.com" || s.email === "thomasmkhasibe10@gmail.com"
    );

    const meritCategories = ["Helpfulness", "Academic Excellence", "Leadership", "Sportsmanship", "Respect"];
    const demeritCategories = ["Disruptive Behaviour", "Late Submission", "Truancy", "Disrespect", "Property Damage"];

    let recordsCreated = 0;

    for (const student of targetStudents) {
      // 3-5 merits
      const numMerits = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < numMerits; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        await ctx.db.insert("behaviourRecords", {
          studentUserId: student._id,
          awardedByUserId: teacher._id,
          type: "merit",
          category: meritCategories[Math.floor(Math.random() * meritCategories.length)],
          description: `Seeded positive behaviour record ${i + 1}`,
          points: 1,
          occurredAt: now - (daysAgo * DAY),
          createdAt: now,
        });
        recordsCreated++;
      }

      // 1-2 demerits
      const numDemerits = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numDemerits; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        await ctx.db.insert("behaviourRecords", {
          studentUserId: student._id,
          awardedByUserId: teacher._id,
          type: "demerit",
          category: demeritCategories[Math.floor(Math.random() * demeritCategories.length)],
          description: `Seeded negative behaviour record ${i + 1}`,
          points: -1,
          occurredAt: now - (daysAgo * DAY),
          createdAt: now,
        });
        recordsCreated++;
      }
    }

    return {
      message: `✅ Behaviour seed complete. Created ${recordsCreated} records for ${targetStudents.length} students.`,
    };
  },
});

export const linkByEmail = mutation({
  args: {
    parentEmail: v.string(),
    studentEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.parentEmail))
      .first();

    if (!parent) throw new Error("Parent not found");

    for (const sEmail of args.studentEmails) {
      const student = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", sEmail))
        .first();

      if (!student) throw new Error(`Student ${sEmail} not found`);

      const existing = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
        .filter((q) => q.eq(q.field("studentId"), student._id))
        .first();

      if (!existing) {
        await ctx.db.insert("parentStudentLinks", {
          parentId: parent._id,
          studentId: student._id,
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const seedTerm1Reports = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    const adminId = admin?._id;

    const enrollments = await ctx.db
      .query("enrollments")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    let count = 0;

    for (const e of enrollments) {
      const existing = await ctx.db
        .query("finalMarks")
        .withIndex("by_course_and_student", (q) =>
          q.eq("courseId", e.courseId).eq("studentUserId", e.studentUserId)
        )
        .first();

      // Generate a believable mark between 50 and 95
      const mark = Math.floor(Math.random() * 46) + 50;

      if (existing) {
        await ctx.db.patch(existing._id, {
          computedFinalMark: mark,
          overrideMark: mark,
          status: "published",
          notes: "Term 1 Final Report - System Generated",
          publishedAt: Date.now(),
          publishedByUserId: adminId,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("finalMarks", {
          courseId: e.courseId,
          studentUserId: e.studentUserId,
          computedAssignmentPercent: mark,
          computedQuizPercent: mark,
          computedFinalMark: mark,
          overrideMark: mark,
          notes: "Term 1 Final Report - System Generated",
          status: "published",
          updatedAt: Date.now(),
          publishedAt: Date.now(),
          publishedByUserId: adminId,
        });
      }
      count++;
    }

    return { message: `✅ Successfully seeded Term 1 reports for ${count} enrollments.` };
  },
});

