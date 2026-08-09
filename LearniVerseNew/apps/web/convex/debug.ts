import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getStudentId = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "student")).first();
    return user?._id ?? "no_student_found";
  }
});

export const getBookingsInfo = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const bookings = await ctx.db.query("transportBookings").collect();
    const myBookings = bookings.filter(b => b.learnerUserId === args.studentId);
    return {
      totalBookings: bookings.length,
      myBookings: myBookings.map(b => ({
        id: b._id,
        routeId: b.routeId,
        status: b.status
      }))
    };
  }
});

export const getRouteInfo = query({
  args: { routeId: v.id("transportRoutes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) return "route not found";
    const driver = route.driverUserId ? await ctx.db.get(route.driverUserId) : null;
    return {
      route: route.name,
      driverUserId: route.driverUserId,
      driverEmail: driver?.email
    };
  }
});

export const forceAssignDriver = mutation({
  args: { routeId: v.id("transportRoutes") },
  handler: async (ctx, args) => {
    const driver = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "driver")).first();
    if (!driver) throw new Error("No driver found");
    
    await ctx.db.patch(args.routeId, { driverUserId: driver._id });
    return `Route assigned to ${driver.email}`;
  }
});
