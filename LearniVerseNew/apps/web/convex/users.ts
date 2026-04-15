import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const BOOTSTRAP_ADMIN_EMAILS = new Set<string>(["lgumbi2169@gmail.com", "faxqiniso@gmail.com"]);
// ── Replace the +teacher / +parent addresses with your real Gmail aliases ──
const BOOTSTRAP_TEACHER_EMAILS = new Set<string>([
  "lgumbi2169@gmail.com",
  "lgumbi2169+teacher@gmail.com",
  "sitholeandries89@gmail.com",
]);
const BOOTSTRAP_PARENT_EMAILS = new Set<string>([
  "lgumbi2169+parent@gmail.com",
  "njabulomorris0@gmail.com",
  "intradelis@gmail.com",
]);

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const upsertFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("teacher"),
        v.literal("student"),
        v.literal("parent"),
        v.literal("warehouse_admin"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.email.trim().toLowerCase();

    // Primary lookup by Clerk user ID
    let existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    // Fallback: find a seed placeholder with the same email and claim it
    if (!existing) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();
      if (byEmail?.clerkUserId.startsWith("seed_placeholder_")) {
        // Claim the placeholder by updating its clerkUserId to the real one
        await ctx.db.patch(byEmail._id, {
          clerkUserId: args.clerkUserId,
          updatedAt: now,
        });
        existing = { ...byEmail, clerkUserId: args.clerkUserId };
      }
    }
    const bootstrapRole = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail)
      ? "admin"
      : BOOTSTRAP_TEACHER_EMAILS.has(normalizedEmail)
      ? "teacher"
      : BOOTSTRAP_PARENT_EMAILS.has(normalizedEmail)
      ? "parent"
      : args.role;
    const bootstrapAvailableRoles = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail)
      ? ["admin", "teacher", "student", "parent", "warehouse_admin"]
      : undefined;

    let userId: string;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        fullName: args.fullName,
        phone: args.phone,
        role: bootstrapRole ?? existing.role,
        availableRoles: bootstrapAvailableRoles ?? existing.availableRoles,
        isActive: true,
        updatedAt: now,
      });
      userId = existing._id;
    } else {
      userId = await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        fullName: args.fullName,
        phone: args.phone,
        role: bootstrapRole ?? args.role ?? "parent",
        availableRoles: bootstrapAvailableRoles,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── Auto-provision learner if this email matches a paid + approved application ──
    const matchingApps = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_student_email", (q) => q.eq("studentEmail", normalizedEmail))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("paymentStatus"), "paid"),
        ),
      )
      .collect();

    for (const app of matchingApps) {
      // Skip if student profile already exists (idempotent)
      const existingProfile = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId as any))
        .first();

      if (!existingProfile) {
        // Create student profile with the grade from the application
        await ctx.db.insert("studentProfiles", {
          userId: userId as any,
          qualificationId: app.gradeLabel,
          createdAt: now,
          updatedAt: now,
        });

        // Ensure role is "student"
        await ctx.db.patch(userId as any, { role: "student", updatedAt: now });

        // Create parent–student link
        const existingLink = await ctx.db
          .query("parentStudentLinks")
          .withIndex("by_student", (q) => q.eq("studentId", userId as any))
          .first();

        if (!existingLink) {
          await ctx.db.insert("parentStudentLinks", {
            parentId: app.studentUserId,
            studentId: userId as any,
            createdAt: now,
          });
        }

        const studentDisplayName = args.firstName ?? args.email;
        const grade = app.gradeLabel ?? "High School";

        // Notify the parent that their child is now active
        await ctx.db.insert("notifications", {
          userId: app.studentUserId,
          title: "Learner Account Activated",
          body: `${studentDisplayName} has signed in and is now enrolled in ${grade}. They can access the platform immediately.`,
          type: "enrollment",
          isRead: false,
          createdAt: now,
        });
      }
    }

    return userId;
  },
});

export const setRoleByIdentifier = mutation({
  args: {
    identifier: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("teacher"),
      v.literal("student"),
      v.literal("parent"),
      v.literal("warehouse_admin"),
    ),
  },
  handler: async (ctx, args) => {
    const normalizedIdentifier = args.identifier.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();

    const match = users.find((user) => {
      const email = user.email.toLowerCase();
      const fullName = user.fullName?.toLowerCase() ?? "";
      const clerkUserId = user.clerkUserId.toLowerCase();
      const emailLocal = email.split("@")[0] ?? "";

      return (
        email === normalizedIdentifier ||
        emailLocal === normalizedIdentifier ||
        clerkUserId === normalizedIdentifier ||
        fullName === normalizedIdentifier
      );
    });

    if (!match) {
      throw new Error(`No user found for identifier "${args.identifier}".`);
    }

    await ctx.db.patch(match._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return {
      ...match,
      role: args.role,
    };
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("teacher"),
      v.literal("student"),
      v.literal("warehouse_admin"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (caller?.role !== "admin") {
      throw new Error("Only admins can update roles.");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});

export const applyBootstrapRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const updates: Array<{ email: string; role: string }> = [];

    const ROLES = ["admin", "teacher", "student", "parent", "warehouse_admin"];

    for (const user of users) {
      const email = user.email.toLowerCase();
      let changed = false;
      let newRole = user.role;
      let availableRoles = user.availableRoles ?? [];

      if (BOOTSTRAP_ADMIN_EMAILS.has(email) || BOOTSTRAP_TEACHER_EMAILS.has(email) || BOOTSTRAP_PARENT_EMAILS.has(email)) {
        const targetRole = BOOTSTRAP_ADMIN_EMAILS.has(email) ? "admin" : BOOTSTRAP_TEACHER_EMAILS.has(email) ? "teacher" : "parent";
        if (user.role !== targetRole) {
           newRole = targetRole as any;
           changed = true;
        }
        if (BOOTSTRAP_ADMIN_EMAILS.has(email)) {
          if (JSON.stringify(availableRoles) !== JSON.stringify(ROLES)) {
             availableRoles = ROLES as any;
             changed = true;
          }
        } else {
           if (!availableRoles.includes(targetRole)) {
              availableRoles = [...availableRoles, targetRole] as any;
              changed = true;
           }
        }
      }

      if (changed) {
        await ctx.db.patch(user._id, {
          role: newRole,
          availableRoles: availableRoles,
          updatedAt: Date.now(),
        });

        updates.push({
          email: user.email,
          role: newRole,
        });
      }
    }

    return updates;
  },
});

export const switchRole = mutation({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    if (!user.availableRoles?.includes(args.role)) {
      throw new Error("You are not authorized for this role");
    }

    await ctx.db.patch(user._id, {
      role: args.role as any,
      updatedAt: Date.now(),
    });

    return { success: true, role: args.role };
  },
});

export const setSuperUserRoles = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Basic security: only admins can call this
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (caller?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found");

    const roles = ["admin", "teacher", "student", "parent", "warehouse_admin"];
    await ctx.db.patch(user._id, {
      availableRoles: roles,
      role: "admin", // Default to admin
      updatedAt: Date.now(),
    });

    return { success: true, roles };
  },
});

export const seedSuperUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found");

    const roles = ["admin", "teacher", "student", "parent", "warehouse_admin"];
    await ctx.db.patch(user._id, {
      availableRoles: roles,
      role: "admin",
      updatedAt: Date.now(),
    });

    return { success: true, roles };
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const firstName = args.firstName?.trim() || user.firstName;
    const lastName = args.lastName?.trim() || user.lastName;
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    await ctx.db.patch(user._id, {
      firstName,
      lastName,
      fullName,
      username: args.username?.trim() || user.username,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
