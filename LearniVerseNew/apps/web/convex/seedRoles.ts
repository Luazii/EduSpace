import { mutation } from "./_generated/server";

export const seedNewRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Seed Coach
    await ctx.db.insert("users", {
      clerkUserId: "seed_coach_1",
      email: "coach@eduspace.test",
      firstName: "John",
      lastName: "Coachman",
      fullName: "John Coachman",
      role: "coach",
      isActive: true,
      availableRoles: ["coach"],
      createdAt: now,
      updatedAt: now,
    });

    // Seed Driver
    await ctx.db.insert("users", {
      clerkUserId: "seed_driver_1",
      email: "driver@eduspace.test",
      firstName: "Dave",
      lastName: "Wheels",
      fullName: "Dave Wheels",
      role: "driver",
      isActive: true,
      availableRoles: ["driver"],
      createdAt: now,
      updatedAt: now,
    });

    // Seed Transport Admin
    await ctx.db.insert("users", {
      clerkUserId: "seed_transport_admin_1",
      email: "transport@eduspace.test",
      firstName: "Sarah",
      lastName: "Logistics",
      fullName: "Sarah Logistics",
      role: "transport_admin",
      isActive: true,
      availableRoles: ["transport_admin"],
      createdAt: now,
      updatedAt: now,
    });

    return "Successfully seeded new roles (coach, driver, transport_admin)";
  },
});
