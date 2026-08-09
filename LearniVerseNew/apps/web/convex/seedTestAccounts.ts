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
    const existingStudentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", studentId))
      .first();
    if (!existingStudentProfile) {
      await ctx.db.insert("studentProfiles", {
        userId: studentId,
        studentNumber: "STU-TEST-01",
        createdAt: now,
        updatedAt: now,
      });
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

    // ── 5. Coach: a sport + a team they coach ────────────────────────────
    let sport = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", "Football"))
      .first();
    let sportId: Id<"sports">;
    if (!sport) {
      sportId = await ctx.db.insert("sports", {
        name: "Football",
        category: "Team Sport",
        coachName: "John Coachman",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      sportId = sport._id;
    }

    const existingTeam = await ctx.db
      .query("sportsTeams")
      .withIndex("by_sport", (q) => q.eq("sportId", sportId))
      .first();
    if (!existingTeam) {
      await ctx.db.insert("sportsTeams", {
        sportId,
        name: "1st XI",
        coachUserId: coachId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (!existingTeam.coachUserId) {
      await ctx.db.patch(existingTeam._id, { coachUserId: coachId, updatedAt: now });
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
      if (!existingRoute.driverUserId) {
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

    return {
      message: "Seeded 8 test accounts (admin, teacher, coach, student, parent, driver, transport_admin, warehouse_admin) with real Clerk IDs.",
      password: "EduSpace!QaTest2026#Zk",
      sweptStrayRows: sweptCount,
      accounts: ACCOUNTS.map((a) => ({ role: a.role, email: a.email })),
    };
  },
});
