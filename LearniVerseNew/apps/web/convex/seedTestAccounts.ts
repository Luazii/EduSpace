import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Seeds Convex `users` rows (+ light supporting data) for 8 real Clerk test
 * accounts, one per role. The Clerk accounts already exist (created via the
 * Clerk Backend API) — this mutation just links Convex data to their real
 * clerkUserId so they behave like normal signed-in users.
 *
 * TEST CREDENTIALS (test-mode Clerk instance — safe to share)
 * ──────────────────────────────────────────────────────────
 *   All 8 accounts share the password: EduSpace!QaTest2026#Zk
 *   (Edu123! was rejected by Clerk as a known-breached password — this one isn't.)
 *
 *   admin      → admin@eduspaceqa.com       (all roles unlocked)
 *   teacher    → teacher@eduspaceqa.com
 *   coach      → coach@eduspaceqa.com
 *   student    → student@eduspaceqa.com
 *   parent     → parent@eduspaceqa.com      (linked to the student)
 *   driver     → driver@eduspaceqa.com      (assigned to a route)
 *   transport_admin → transport@eduspaceqa.com (created the route)
 *   warehouse_admin → warehouse@eduspaceqa.com
 *
 * IMPORTANT: always sign in with these — never "sign up" with them again
 * (a fresh Sign Up on an existing email correctly errors with "that email
 * is taken" rather than creating a duplicate).
 *
 * These accounts live on the Clerk instance at
 * https://positive-glowworm-67.clerk.accounts.dev — the canonical instance
 * for this app. Convex's CLERK_SECRET_KEY / CLERK_JWT_ISSUER_DOMAIN and
 * apps/web/.env.local's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must all point
 * here, or sign-in will succeed against Clerk but Convex will reject the
 * session token (issuer mismatch) and/or these seeded rows won't match the
 * real clerkUserId. (We previously had a proper-eagle-83 / positive-
 * glowworm-67 split between frontend and backend — that's what caused
 * "signed in but landed on parent role" the first time around.)
 *
 * Re-running this mutation is safe/idempotent — it upserts by clerkUserId
 * and also sweeps any stray @eduspaceqa.com rows pointing at a stale
 * clerkUserId (e.g. left over from an instance switch).
 *
 * The seeded student's QR scan code (sports attendance + bus boarding) is
 * fixed at "EDUSPACE01" — generate an image for it with any QR encoder, or
 * just view it on their Profile page once signed in.
 */

const ALL_ROLES = [
  "admin",
  "teacher",
  "coach",
  "student",
  "parent",
  "driver",
  "transport_admin",
  "warehouse_admin",
] as const;

type Role = (typeof ALL_ROLES)[number];

const ACCOUNTS: Array<{
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}> = [
  { clerkUserId: "user_3HgCQ1fC4AH0lq3Ig2wdMeVF7K0", email: "admin@eduspaceqa.com", firstName: "Amanda", lastName: "Admin", role: "admin" },
  { clerkUserId: "user_3HgCQ2ZucPr458QoGL2zLgDJkCs", email: "teacher@eduspaceqa.com", firstName: "Alex", lastName: "Dlamini", role: "teacher" },
  { clerkUserId: "user_3HgCQ4GIkJkWCBPWV4JBPGuOdC5", email: "coach@eduspaceqa.com", firstName: "John", lastName: "Coachman", role: "coach" },
  { clerkUserId: "user_3HgCQBZLqHTsxoDY8lvhcd5hVt8", email: "student@eduspaceqa.com", firstName: "Test", lastName: "Learner", role: "student" },
  { clerkUserId: "user_3HgCQFgdmNO9qxmfI18HTjuiGBS", email: "parent@eduspaceqa.com", firstName: "Bongiwe", lastName: "Mokoena", role: "parent" },
  { clerkUserId: "user_3HgCQNECRrbJkSRJjn0weAdBJvl", email: "driver@eduspaceqa.com", firstName: "Dave", lastName: "Wheels", role: "driver" },
  { clerkUserId: "user_3HgCQWiFFGQmznumoP2GQUHAFoA", email: "transport@eduspaceqa.com", firstName: "Sarah", lastName: "Logistics", role: "transport_admin" },
  { clerkUserId: "user_3HgCQTB8vqscpVP3hcgiyI0tGqh", email: "warehouse@eduspaceqa.com", firstName: "Wendy", lastName: "Warehouse", role: "warehouse_admin" },
];

export const seedTestAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const byRole = new Map<Role, Id<"users">>();

    // ── 0. Sweep stray rows left by the +clerk_test duplicate-account bug ──
    // (old @eduspaceqa.com rows whose clerkUserId isn't one of the current,
    // real Clerk accounts below — e.g. the "parent"-defaulted phantom rows
    // created when someone hit Sign Up instead of Sign In).
    const canonicalIds = new Set(ACCOUNTS.map((a) => a.clerkUserId));
    const strayRows = await ctx.db.query("users").collect();
    let sweptCount = 0;
    for (const row of strayRows) {
      if (row.email.endsWith("@eduspaceqa.com") && !canonicalIds.has(row.clerkUserId)) {
        await ctx.db.delete(row._id);
        sweptCount++;
      }
    }

    // ── 1. Upsert the 8 users by real clerkUserId ──────────────────────────
    for (const acct of ACCOUNTS) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", acct.clerkUserId))
        .first();

      const availableRoles = acct.role === "admin" ? [...ALL_ROLES] : [acct.role];

      let userId: Id<"users">;
      if (existing) {
        await ctx.db.patch(existing._id, {
          email: acct.email,
          firstName: acct.firstName,
          lastName: acct.lastName,
          fullName: `${acct.firstName} ${acct.lastName}`,
          role: acct.role,
          isActive: true,
          availableRoles,
          updatedAt: now,
        });
        userId = existing._id;
      } else {
        userId = await ctx.db.insert("users", {
          clerkUserId: acct.clerkUserId,
          email: acct.email,
          firstName: acct.firstName,
          lastName: acct.lastName,
          fullName: `${acct.firstName} ${acct.lastName}`,
          role: acct.role,
          isActive: true,
          availableRoles,
          createdAt: now,
          updatedAt: now,
        });
      }
      byRole.set(acct.role, userId);
    }

    const teacherId = byRole.get("teacher")!;
    const studentId = byRole.get("student")!;
    const parentId = byRole.get("parent")!;
    const coachId = byRole.get("coach")!;
    const driverId = byRole.get("driver")!;
    const transportAdminId = byRole.get("transport_admin")!;
    const warehouseAdminId = byRole.get("warehouse_admin")!;

    // ── 2. Teacher profile ───────────────────────────────────────────────
    const existingTeacherProfile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", teacherId))
      .first();
    if (!existingTeacherProfile) {
      await ctx.db.insert("teacherProfiles", {
        userId: teacherId,
        employeeNumber: "EMP-TEST-01",
        qualificationText: "B.Ed (Hons) Computer Science",
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── 3. Student profile ───────────────────────────────────────────────
    // Fixed (not random) scan code for the seed student — deterministic so
    // it's easy to hand to a tester or hardcode in a QR image for demoing
    // without having to sign in as the student first to generate one.
    const SEED_STUDENT_SCAN_CODE = "EDUSPACE01";
    const existingStudentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", studentId))
      .first();
    if (!existingStudentProfile) {
      await ctx.db.insert("studentProfiles", {
        userId: studentId,
        studentNumber: "STU-TEST-01",
        scanCode: SEED_STUDENT_SCAN_CODE,
        createdAt: now,
        updatedAt: now,
      });
    } else if (!existingStudentProfile.scanCode) {
      await ctx.db.patch(existingStudentProfile._id, { scanCode: SEED_STUDENT_SCAN_CODE, updatedAt: now });
    }

    // ── 4. Parent ↔ student link ─────────────────────────────────────────
    const existingLink = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .first();
    if (!existingLink) {
      await ctx.db.insert("parentStudentLinks", {
        parentId,
        studentId,
        relationship: "parent",
        createdAt: now,
      });
    }

    // ── 5. Coach: sports + teams they coach, each with the seeded student
    // on the roster (so "My Teams" isn't just an assignment with nobody on it) ──
    async function ensureCoachTeam(sportName: string, teamName: string, createSportIfMissing: boolean) {
      let sport = await ctx.db
        .query("sports")
        .withIndex("by_name", (q) => q.eq("name", sportName))
        .first();
      if (!sport && createSportIfMissing) {
        const sportId = await ctx.db.insert("sports", {
          name: sportName,
          category: "Team Sport",
          coachName: "John Coachman",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        sport = (await ctx.db.get(sportId))!;
      }
      if (!sport) return; // e.g. "girls rugby" not created yet — nothing to attach to

      let team = await ctx.db
        .query("sportsTeams")
        .withIndex("by_sport", (q) => q.eq("sportId", sport!._id))
        .first();
      if (!team) {
        const teamId = await ctx.db.insert("sportsTeams", {
          sportId: sport._id,
          name: teamName,
          coachUserId: coachId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        team = (await ctx.db.get(teamId))!;
      } else if (team.coachUserId !== coachId) {
        // Always resync, not just when unset — a stale coachUserId (e.g. from
        // an earlier Clerk-instance switch that reissued this user's _id)
        // would otherwise sit there forever pointing at a dead user document.
        await ctx.db.patch(team._id, { coachUserId: coachId, updatedAt: now });
      }

      const existingMembership = await ctx.db
        .query("teamMemberships")
        .withIndex("by_team_and_student", (q) => q.eq("teamId", team!._id).eq("studentUserId", studentId))
        .first();
      if (!existingMembership) {
        await ctx.db.insert("teamMemberships", {
          teamId: team._id,
          studentUserId: studentId,
          status: "active",
          joinedAt: now,
        });
      } else if (existingMembership.status !== "active") {
        await ctx.db.patch(existingMembership._id, { status: "active" });
      }

      return team._id;
    }

    const footballTeamId = await ensureCoachTeam("Football", "1st XI", true);
    await ensureCoachTeam("girls rugby", "Girls Rugby 1st Team", false);

    // ── 5b. Demo data for the newer sports use cases: a training session
    // that already started (so scanning the student's QR code right now
    // demonstrably logs "late", not "present"), and a completed fixture
    // with a recorded result so team standings has something to show. ──
    if (footballTeamId) {
      const existingPastSession = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", footballTeamId))
        .filter((q) => q.eq(q.field("title"), "Fitness & Drills"))
        .first();
      if (!existingPastSession) {
        await ctx.db.insert("trainingSessions", {
          teamId: footballTeamId,
          title: "Fitness & Drills",
          startTime: now - 20 * 60 * 1000, // started 20 min ago — a scan now reads "late"
          endTime: now + 40 * 60 * 1000,
          venue: "Main Field",
          status: "scheduled",
          createdByUserId: coachId,
          createdAt: now,
        });
      }

      const existingCompletedFixture = await ctx.db
        .query("matchFixtures")
        .withIndex("by_team", (q) => q.eq("teamId", footballTeamId))
        .filter((q) => q.eq(q.field("opponentName"), "Riverside High"))
        .first();
      let completedFixtureId = existingCompletedFixture?._id;
      if (!existingCompletedFixture) {
        completedFixtureId = await ctx.db.insert("matchFixtures", {
          teamId: footballTeamId,
          opponentName: "Riverside High",
          venue: "Main Field",
          isHomeFixture: true,
          matchTime: now - 7 * 24 * 60 * 60 * 1000, // a week ago
          status: "completed",
          createdByUserId: coachId,
          createdAt: now,
        });
      }
      if (completedFixtureId) {
        const existingResult = await ctx.db
          .query("matchResults")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", completedFixtureId!))
          .first();
        if (!existingResult) {
          await ctx.db.insert("matchResults", {
            fixtureId: completedFixtureId,
            ourScore: 3,
            opponentScore: 1,
            result: "win",
            matchReport: "Strong first-half performance, seed data.",
            recordedByUserId: coachId,
            recordedAt: now,
          });
        }
      }
    }

    // ── 5b2. Richer sports history (Phase 3): a couple of fully-past
    // sessions with attendance already recorded, a second completed
    // fixture (a draw, for standings variety), two prior evaluations, and
    // a venue booking — so reports/standings/evaluations show real
    // computed numbers immediately, not just zeros. ───────────────────────
    if (footballTeamId) {
      const priorSessionSpecs = [
        { title: "Tactics & Set Pieces", daysAgo: 10, attendanceStatus: "present" as const },
        { title: "Preseason Conditioning", daysAgo: 17, attendanceStatus: "late" as const },
      ];
      for (const spec of priorSessionSpecs) {
        const existing = await ctx.db
          .query("trainingSessions")
          .withIndex("by_team", (q) => q.eq("teamId", footballTeamId))
          .filter((q) => q.eq(q.field("title"), spec.title))
          .first();
        let sessionId = existing?._id;
        if (!existing) {
          const start = now - spec.daysAgo * 24 * 60 * 60 * 1000;
          sessionId = await ctx.db.insert("trainingSessions", {
            teamId: footballTeamId,
            title: spec.title,
            startTime: start,
            endTime: start + 90 * 60 * 1000,
            venue: "Main Field",
            status: "scheduled", // status field isn't what determines "held" — see coach.ts note
            createdByUserId: coachId,
            createdAt: now,
          });
        }
        if (sessionId) {
          const existingAttendance = await ctx.db
            .query("sportsAttendance")
            .withIndex("by_session_and_student", (q) => q.eq("sessionId", sessionId!).eq("studentUserId", studentId))
            .first();
          if (!existingAttendance) {
            await ctx.db.insert("sportsAttendance", {
              sessionId,
              studentUserId: studentId,
              status: spec.attendanceStatus,
              markedByUserId: coachId,
              markedAt: now,
            });
          }
        }
      }

      const existingDrawFixture = await ctx.db
        .query("matchFixtures")
        .withIndex("by_team", (q) => q.eq("teamId", footballTeamId))
        .filter((q) => q.eq(q.field("opponentName"), "Lakeside College"))
        .first();
      let drawFixtureId = existingDrawFixture?._id;
      if (!existingDrawFixture) {
        drawFixtureId = await ctx.db.insert("matchFixtures", {
          teamId: footballTeamId,
          opponentName: "Lakeside College",
          venue: "Lakeside Grounds",
          isHomeFixture: false,
          matchTime: now - 14 * 24 * 60 * 60 * 1000,
          status: "completed",
          createdByUserId: coachId,
          createdAt: now,
        });
      }
      if (drawFixtureId) {
        const existingDrawResult = await ctx.db
          .query("matchResults")
          .withIndex("by_fixture", (q) => q.eq("fixtureId", drawFixtureId!))
          .first();
        if (!existingDrawResult) {
          await ctx.db.insert("matchResults", {
            fixtureId: drawFixtureId,
            ourScore: 2,
            opponentScore: 2,
            result: "draw",
            matchReport: "Hard-fought away draw, seed data.",
            recordedByUserId: coachId,
            recordedAt: now,
          });
        }
      }

      const existingReports = await ctx.db
        .query("sportsReports")
        .withIndex("by_student", (q) => q.eq("studentUserId", studentId))
        .collect();
      if (existingReports.length === 0) {
        const footballSportForReports = await ctx.db
          .query("sports")
          .withIndex("by_name", (q) => q.eq("name", "Football"))
          .first();
        if (footballSportForReports) {
          await ctx.db.insert("sportsReports", {
            studentUserId: studentId,
            coachUserId: coachId,
            sportId: footballSportForReports._id,
            evaluationDate: now - 17 * 24 * 60 * 60 * 1000,
            performanceScore: 6,
            comments: "Solid fundamentals, needs to work on off-ball movement. Seed data.",
            createdAt: now,
          });
          await ctx.db.insert("sportsReports", {
            studentUserId: studentId,
            coachUserId: coachId,
            sportId: footballSportForReports._id,
            evaluationDate: now - 3 * 24 * 60 * 60 * 1000,
            performanceScore: 8,
            comments: "Great improvement in match awareness and finishing. Seed data.",
            createdAt: now,
          });
        }
      }

      const mainFieldVenue = await ctx.db
        .query("sportsVenues")
        .withIndex("by_name", (q) => q.eq("name", "main field"))
        .first();
      if (mainFieldVenue) {
        const existingBooking = await ctx.db
          .query("sportsVenueBookings")
          .withIndex("by_coach", (q) => q.eq("coachUserId", coachId))
          .first();
        if (!existingBooking) {
          const start = now + 2 * 24 * 60 * 60 * 1000;
          await ctx.db.insert("sportsVenueBookings", {
            venueId: mainFieldVenue._id,
            coachUserId: coachId,
            title: "1st XI training block",
            startTime: start,
            endTime: start + 2 * 60 * 60 * 1000,
            status: "active",
            createdAt: now,
          });
        }
      }
    }

    // ── 5c. A ticketed sports event (UC07) — upcoming, priced, so the
    // seeded parent/student have something real to buy against. ──────────
    if (footballTeamId) {
      const footballSport = await ctx.db
        .query("sports")
        .withIndex("by_name", (q) => q.eq("name", "Football"))
        .first();
      const existingTicketedEvent = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("title"), "1st XI vs Northside Academy"))
        .first();
      if (!existingTicketedEvent) {
        await ctx.db.insert("events", {
          title: "1st XI vs Northside Academy",
          description: "Home derby — gates open 30 min before kickoff.",
          eventDate: now + 5 * 24 * 60 * 60 * 1000, // 5 days from now
          location: "Main Field",
          capacity: 200,
          ticketPrice: 50,
          sportId: footballSport?._id,
          isActive: true,
          createdByUserId: coachId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // ── 6. Driver + transport_admin: a route they're linked to ──────────
    const existingRoute = await ctx.db
      .query("transportRoutes")
      .withIndex("by_route_code", (q) => q.eq("routeCode", "TEST-RT-01"))
      .first();
    let routeId: Id<"transportRoutes">;
    if (!existingRoute) {
      routeId = await ctx.db.insert("transportRoutes", {
        routeCode: "TEST-RT-01",
        name: "Test School Run",
        description: "Seeded test route",
        serviceType: "school_run",
        capacity: 40,
        driverUserId: driverId,
        busLabel: "Bus 01",
        isActive: true,
        createdByUserId: transportAdminId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      routeId = existingRoute._id;
      if (existingRoute.driverUserId !== driverId) {
        await ctx.db.patch(existingRoute._id, { driverUserId: driverId, updatedAt: now });
      }
    }

    // ── 6b. Book the seeded student onto that route, approved, so the
    // driver's boarding scanner has something real to scan ──────────────
    const existingBooking = await ctx.db
      .query("transportBookings")
      .withIndex("by_route", (q) => q.eq("routeId", routeId))
      .filter((q) => q.eq(q.field("learnerUserId"), studentId))
      .first();
    if (!existingBooking) {
      await ctx.db.insert("transportBookings", {
        routeId,
        learnerUserId: studentId,
        requestedByUserId: parentId,
        status: "approved",
        approvedByUserId: transportAdminId,
        approvedAt: now,
        notes: "Seed data",
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── 6b2. A second route with a PENDING booking (Phase 3) — so the
    // transport admin's approval queue has something real to act on
    // instead of being empty by default. ─────────────────────────────────
    const existingEventRoute = await ctx.db
      .query("transportRoutes")
      .withIndex("by_route_code", (q) => q.eq("routeCode", "TEST-RT-02"))
      .first();
    let eventRouteId: Id<"transportRoutes"> | undefined = existingEventRoute?._id;
    if (!existingEventRoute) {
      eventRouteId = await ctx.db.insert("transportRoutes", {
        routeCode: "TEST-RT-02",
        name: "Saturday Sports Fixture Shuttle",
        description: "Seeded test route — event transport",
        serviceType: "event",
        capacity: 20,
        driverUserId: driverId,
        busLabel: "Bus 02",
        isActive: true,
        createdByUserId: transportAdminId,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (eventRouteId) {
      const existingPendingBooking = await ctx.db
        .query("transportBookings")
        .withIndex("by_route", (q) => q.eq("routeId", eventRouteId!))
        .filter((q) => q.eq(q.field("learnerUserId"), studentId))
        .first();
      if (!existingPendingBooking) {
        await ctx.db.insert("transportBookings", {
          routeId: eventRouteId,
          learnerUserId: studentId,
          requestedByUserId: parentId,
          status: "pending",
          notes: "Seed data — awaiting approval",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // ── 6b3. A resolved incident (alongside whatever real ones exist) so
    // the Incidents tab shows the full open -> resolved lifecycle. ───────
    const existingResolvedIncident = await ctx.db
      .query("transportIncidents")
      .withIndex("by_route", (q) => q.eq("routeId", routeId))
      .filter((q) => q.eq(q.field("title"), "Minor delay — traffic"))
      .first();
    if (!existingResolvedIncident) {
      await ctx.db.insert("transportIncidents", {
        routeId,
        reportedByUserId: driverId,
        title: "Minor delay — traffic",
        description: "Route ran ~10 minutes behind schedule due to road closure. Seed data.",
        status: "resolved",
        latitude: -26.2041,
        longitude: 28.0473,
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
        updatedAt: now - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
      });
    }

    // ── 6b4. A live GPS position for the route (Phase 3, UC14) — so the
    // parent's tracking panel shows something immediately without needing
    // the driver to physically drive first. ──────────────────────────────
    const existingLocation = await ctx.db
      .query("busLocations")
      .withIndex("by_route", (q) => q.eq("routeId", routeId))
      .first();
    if (!existingLocation) {
      await ctx.db.insert("busLocations", {
        routeId,
        driverUserId: driverId,
        latitude: -26.2041,
        longitude: 28.0473,
        recordedAt: now,
      });
    }

    // ── 6c. Enroll the seeded student in the full Grade 9 subject load ───
    const existingStudentProfileForGrade = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", studentId))
      .first();
    if (existingStudentProfileForGrade && existingStudentProfileForGrade.qualificationId !== "Grade 9") {
      await ctx.db.patch(existingStudentProfileForGrade._id, { qualificationId: "Grade 9", updatedAt: now });
    }

    const GRADE9_COURSE_CODES = ["MATH-G9", "ENG-G9", "CA-G9", "LO-G9", "EMS-G9", "TECH-G9", "SS-G9", "NS-G9", "FAL-G9"];
    const grade9CourseIds: Id<"courses">[] = [];
    for (const code of GRADE9_COURSE_CODES) {
      const course = await ctx.db
        .query("courses")
        .withIndex("by_course_code", (q) => q.eq("courseCode", code))
        .first();
      if (course) grade9CourseIds.push(course._id);
    }

    if (grade9CourseIds.length > 0) {
      const existingEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentUserId", studentId))
        .collect();
      const alreadyEnrolledCourseIds = new Set(existingEnrollments.map((e) => e.courseId));
      const missingCourseIds = grade9CourseIds.filter((id) => !alreadyEnrolledCourseIds.has(id));

      if (missingCourseIds.length > 0) {
        const applicationId = await ctx.db.insert("enrollmentApplications", {
          studentUserId: studentId,
          studentEmail: "student@eduspaceqa.com",
          gradeLabel: "Grade 9",
          selectedCourseIds: grade9CourseIds,
          status: "approved",
          paymentStatus: "paid",
          notes: "Seed data — auto-enrolled in Grade 9",
          createdAt: now,
          updatedAt: now,
        });
        for (const courseId of missingCourseIds) {
          await ctx.db.insert("enrollments", {
            studentUserId: studentId,
            courseId,
            applicationId,
            enrolledAt: now,
            status: "active",
          });
        }
      }
    }

    // ── 7. Warehouse admin: a few sample inventory items ─────────────────
    const SAMPLE_ITEMS = [
      { name: "Grade 8 Maths Textbook", category: "Textbook", unit: "pcs", quantityOnHand: 120, reorderLevel: 20 },
      { name: "PE Uniform (Medium)", category: "Uniform", unit: "pcs", quantityOnHand: 8, reorderLevel: 15 },
      { name: "Rugby Balls", category: "Equipment", unit: "pcs", quantityOnHand: 24, reorderLevel: 6 },
      { name: "A4 Printer Paper", category: "Supplies", unit: "box", quantityOnHand: 3, reorderLevel: 5 },
    ];
    for (const sample of SAMPLE_ITEMS) {
      const existingItem = await ctx.db
        .query("inventoryItems")
        .withIndex("by_name", (q) => q.eq("name", sample.name))
        .first();
      if (!existingItem) {
        const itemId = await ctx.db.insert("inventoryItems", {
          name: sample.name,
          category: sample.category,
          unit: sample.unit,
          quantityOnHand: sample.quantityOnHand,
          reorderLevel: sample.reorderLevel,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("inventoryTransactions", {
          itemId,
          type: "receive",
          quantityDelta: sample.quantityOnHand,
          performedByUserId: warehouseAdminId,
          note: "Seed data",
          createdAt: now,
        });
      }
    }

    // ── 7b. A sample delivery (UC01) — warehouse stock assigned to the
    // seeded driver, ready to acknowledge/deliver immediately. ───────────
    const uniformItem = await ctx.db
      .query("inventoryItems")
      .withIndex("by_name", (q) => q.eq("name", "PE Uniform (Medium)"))
      .first();
    if (uniformItem) {
      const existingDelivery = await ctx.db
        .query("deliveries")
        .withIndex("by_driver", (q) => q.eq("driverUserId", driverId))
        .filter((q) => q.eq(q.field("recipientLabel"), "Grade 9A"))
        .first();
      if (!existingDelivery) {
        const deliveryQty = Math.min(2, uniformItem.quantityOnHand);
        if (deliveryQty > 0) {
          await ctx.db.patch(uniformItem._id, {
            quantityOnHand: uniformItem.quantityOnHand - deliveryQty,
            updatedAt: now,
          });
          await ctx.db.insert("inventoryTransactions", {
            itemId: uniformItem._id,
            type: "issue",
            quantityDelta: -deliveryQty,
            issuedToLabel: "Delivery: Grade 9A",
            performedByUserId: warehouseAdminId,
            note: "Seed data",
            createdAt: now,
          });
          await ctx.db.insert("deliveries", {
            itemId: uniformItem._id,
            quantity: deliveryQty,
            recipientLabel: "Grade 9A",
            driverUserId: driverId,
            status: "pending",
            createdByUserId: warehouseAdminId,
            notes: "Seed data — ready to acknowledge",
            createdAt: now,
          });
        }
      }

      // A second delivery already completed, so the delivery history shows
      // the full pending -> acknowledged -> delivered lifecycle, not just
      // one static pending row.
      const existingCompletedDelivery = await ctx.db
        .query("deliveries")
        .withIndex("by_driver", (q) => q.eq("driverUserId", driverId))
        .filter((q) => q.eq(q.field("recipientLabel"), "Coach John (sports equipment)"))
        .first();
      if (!existingCompletedDelivery) {
        const ballsItem = await ctx.db
          .query("inventoryItems")
          .withIndex("by_name", (q) => q.eq("name", "Rugby Balls"))
          .first();
        if (ballsItem && ballsItem.quantityOnHand >= 1) {
          await ctx.db.patch(ballsItem._id, {
            quantityOnHand: ballsItem.quantityOnHand - 1,
            updatedAt: now,
          });
          await ctx.db.insert("inventoryTransactions", {
            itemId: ballsItem._id,
            type: "issue",
            quantityDelta: -1,
            issuedToLabel: "Delivery: Coach John (sports equipment)",
            performedByUserId: warehouseAdminId,
            note: "Seed data",
            createdAt: now - 3 * 24 * 60 * 60 * 1000,
          });
          await ctx.db.insert("deliveries", {
            itemId: ballsItem._id,
            quantity: 1,
            recipientLabel: "Coach John (sports equipment)",
            recipientUserId: coachId,
            driverUserId: driverId,
            status: "delivered",
            createdByUserId: warehouseAdminId,
            notes: "Seed data — completed lifecycle example",
            createdAt: now - 3 * 24 * 60 * 60 * 1000,
            acknowledgedAt: now - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            deliveredAt: now - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
          });
        }
      }
    }

    return {
      message: "Seeded 8 test accounts (admin, teacher, coach, student, parent, driver, transport_admin, warehouse_admin) with real Clerk IDs.",
      password: "EduSpace!QaTest2026#Zk",
      sweptStrayRows: sweptCount,
      accounts: ACCOUNTS.map((a) => ({ role: a.role, email: a.email })),
    };
  },
});
