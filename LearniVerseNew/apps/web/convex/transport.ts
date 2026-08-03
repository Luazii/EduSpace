import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type RouteRole = "admin" | "transport_admin" | "driver" | "parent" | "student";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Must be signed in.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) throw new Error("No user record found.");
  return user;
}

function isTransportAdminish(role: string) {
  return role === "admin" || role === "transport_admin";
}

async function getLinkedLearners(ctx: QueryCtx | MutationCtx, parentId: Id<"users">) {
  const links = await ctx.db
    .query("parentStudentLinks")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .collect();

  const students = await Promise.all(
    links.map(async (link) => {
      const student = await ctx.db.get(link.studentId);
      return student && student.role === "student"
        ? {
            _id: student._id,
            fullName: student.fullName ?? [student.firstName, student.lastName].filter(Boolean).join(" ") ?? student.email,
            email: student.email,
            studentId: student._id,
          }
        : null;
    }),
  );

  return students.filter(Boolean);
}

async function getAccessibleLearners(ctx: QueryCtx | MutationCtx, user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (user.role === "parent") {
    return getLinkedLearners(ctx, user._id);
  }

  if (user.role === "student") {
    return [
      {
        _id: user._id,
        fullName: user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? user.email,
        email: user.email,
        studentId: user._id,
      },
    ];
  }

  const students = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "student"))
    .collect();

  return students
    .filter((student) => student.isActive)
    .map((student) => ({
      _id: student._id,
      fullName: student.fullName ?? [student.firstName, student.lastName].filter(Boolean).join(" ") ?? student.email,
      email: student.email,
      studentId: student._id,
    }));
}

async function getRouteStops(ctx: QueryCtx | MutationCtx, routeId: Id<"transportRoutes">) {
  return (await ctx.db
    .query("transportRouteStops")
    .withIndex("by_route_and_order", (q) => q.eq("routeId", routeId))
    .collect()).sort((a, b) => a.stopOrder - b.stopOrder);
}

async function getRouteSummary(ctx: QueryCtx | MutationCtx, route: any) {
  if (!route) return null;

  const [stops, bookings, incidents] = await Promise.all([
    getRouteStops(ctx, route._id),
    ctx.db.query("transportBookings").withIndex("by_route", (q) => q.eq("routeId", route._id)).collect(),
    ctx.db.query("transportIncidents").withIndex("by_route", (q) => q.eq("routeId", route._id)).collect(),
  ]);

  const driver = route.driverUserId ? await ctx.db.get(route.driverUserId) : null;

  return {
    ...route,
    driverName: driver?.fullName ?? driver?.email ?? null,
    stops,
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((booking) => booking.status === "pending").length,
    approvedBookings: bookings.filter((booking) => booking.status === "approved").length,
    recentIncidents: incidents
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3),
  };
}

export const listRoutes = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const routes = await ctx.db.query("transportRoutes").collect();

    const visibleRoutes = isTransportAdminish(user.role) || user.role === "driver"
      ? routes
      : routes.filter((route) => route.isActive);

    const summaries = await Promise.all(visibleRoutes.map((route) => getRouteSummary(ctx, route)));
    return summaries.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listMyLearners = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return getAccessibleLearners(ctx, user);
  },
});

export const listMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    let bookings: any[] = [];

    if (isTransportAdminish(user.role) || user.role === "driver") {
      bookings = await ctx.db.query("transportBookings").collect();
    } else if (user.role === "parent") {
      const learners = await getLinkedLearners(ctx, user._id);
      for (const learner of learners) {
        const learnerBookings = await ctx.db
          .query("transportBookings")
          .withIndex("by_learner", (q) => q.eq("learnerUserId", learner.studentId))
          .collect();
        bookings.push(...learnerBookings);
      }
    } else {
      bookings = await ctx.db
        .query("transportBookings")
        .withIndex("by_learner", (q) => q.eq("learnerUserId", user._id))
        .collect();
    }

    const uniqueBookings = Array.from(new Map(bookings.map((booking) => [booking._id, booking])).values());
    return Promise.all(
      uniqueBookings
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (booking) => ({
          ...booking,
          route: await ctx.db.get(booking.routeId),
          learner: await ctx.db.get(booking.learnerUserId),
          requestedBy: await ctx.db.get(booking.requestedByUserId),
          pickupStop: booking.pickupStopId ? await ctx.db.get(booking.pickupStopId) : null,
          dropoffStop: booking.dropoffStopId ? await ctx.db.get(booking.dropoffStopId) : null,
        })),
    );
  },
});

export const createRoute = mutation({
  args: {
    routeCode: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    serviceType: v.union(v.literal("school_run"), v.literal("event"), v.literal("special")),
    capacity: v.optional(v.number()),
    driverUserId: v.optional(v.id("users")),
    busLabel: v.optional(v.string()),
    stops: v.array(
      v.object({
        label: v.string(),
        address: v.string(),
        stopOrder: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isTransportAdminish(user.role)) {
      throw new Error("Only admins and transport admins can create routes.");
    }

    const routeCode = args.routeCode.trim().toUpperCase();
    const existing = await ctx.db
      .query("transportRoutes")
      .withIndex("by_route_code", (q) => q.eq("routeCode", routeCode))
      .first();
    if (existing) {
      throw new Error("A route with this code already exists.");
    }

    const now = Date.now();
    const routeId = await ctx.db.insert("transportRoutes", {
      routeCode,
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      serviceType: args.serviceType,
      capacity: args.capacity,
      driverUserId: args.driverUserId,
      busLabel: args.busLabel?.trim() || undefined,
      isActive: true,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const stop of args.stops) {
      await ctx.db.insert("transportRouteStops", {
        routeId,
        label: stop.label.trim(),
        address: stop.address.trim(),
        stopOrder: stop.stopOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return routeId;
  },
});

export const updateRoute = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    routeCode: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    serviceType: v.optional(v.union(v.literal("school_run"), v.literal("event"), v.literal("special"))),
    capacity: v.optional(v.number()),
    driverUserId: v.optional(v.id("users")),
    busLabel: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    stops: v.optional(
      v.array(
        v.object({
          label: v.string(),
          address: v.string(),
          stopOrder: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isTransportAdminish(user.role)) {
      throw new Error("Only admins and transport admins can update routes.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found.");

    if (args.routeCode) {
      const normalized = args.routeCode.trim().toUpperCase();
      const duplicate = await ctx.db
        .query("transportRoutes")
        .withIndex("by_route_code", (q) => q.eq("routeCode", normalized))
        .first();
      if (duplicate && duplicate._id !== route._id) {
        throw new Error("A route with this code already exists.");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.routeId, {
      routeCode: args.routeCode?.trim().toUpperCase(),
      name: args.name?.trim(),
      description: args.description?.trim(),
      serviceType: args.serviceType,
      capacity: args.capacity,
      driverUserId: args.driverUserId,
      busLabel: args.busLabel?.trim(),
      isActive: args.isActive,
      updatedAt: now,
    });

    if (args.stops) {
      const existingStops = await ctx.db
        .query("transportRouteStops")
        .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
        .collect();
      for (const stop of existingStops) {
        await ctx.db.delete(stop._id);
      }
      for (const stop of args.stops) {
        await ctx.db.insert("transportRouteStops", {
          routeId: args.routeId,
          label: stop.label.trim(),
          address: stop.address.trim(),
          stopOrder: stop.stopOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return args.routeId;
  },
});

export const requestBooking = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    learnerUserId: v.id("users"),
    pickupStopId: v.optional(v.id("transportRouteStops")),
    dropoffStopId: v.optional(v.id("transportRouteStops")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const route = await ctx.db.get(args.routeId);
    if (!route || !route.isActive) throw new Error("Route not found or inactive.");

    const learner = await ctx.db.get(args.learnerUserId);
    if (!learner || learner.role !== "student") throw new Error("Learner not found.");

    if (user.role === "parent") {
      const link = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", user._id))
        .filter((q) => q.eq(q.field("studentId"), args.learnerUserId))
        .first();
      if (!link) throw new Error("You are not linked to this learner.");
    } else if (user.role === "student" && user._id !== args.learnerUserId) {
      throw new Error("Students can only request transport for themselves.");
    }

    if (args.pickupStopId || args.dropoffStopId) {
      const allowedStopIds = new Set(
        (await getRouteStops(ctx, args.routeId)).map((stop) => stop._id),
      );
      if (args.pickupStopId && !allowedStopIds.has(args.pickupStopId)) {
        throw new Error("Selected pickup stop does not belong to this route.");
      }
      if (args.dropoffStopId && !allowedStopIds.has(args.dropoffStopId)) {
        throw new Error("Selected dropoff stop does not belong to this route.");
      }
    }

    const existing = await ctx.db
      .query("transportBookings")
      .withIndex("by_learner", (q) => q.eq("learnerUserId", args.learnerUserId))
      .filter((q) => q.eq(q.field("routeId"), args.routeId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        pickupStopId: args.pickupStopId,
        dropoffStopId: args.dropoffStopId,
        notes: args.notes?.trim() || undefined,
        status: "pending",
        requestedByUserId: user._id,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("transportBookings", {
      routeId: args.routeId,
      learnerUserId: args.learnerUserId,
      requestedByUserId: user._id,
      pickupStopId: args.pickupStopId,
      dropoffStopId: args.dropoffStopId,
      status: "pending",
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approveBooking = mutation({
  args: { bookingId: v.id("transportBookings"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isTransportAdminish(user.role)) throw new Error("Only transport admins can approve bookings.");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");

    const now = Date.now();
    await ctx.db.patch(args.bookingId, {
      status: "approved",
      approvedByUserId: user._id,
      approvedAt: now,
      updatedAt: now,
      notes: args.note?.trim() || booking.notes,
    });

    const learner = await ctx.db.get(booking.learnerUserId);
    const recipients = new Set([booking.requestedByUserId, booking.learnerUserId]);
    const route = await ctx.db.get(booking.routeId);

    await Promise.all(
      [...recipients].map((userId) =>
        ctx.db.insert("notifications", {
          userId,
          title: "Transport booking approved",
          body: `${learner?.fullName ?? learner?.email ?? "A learner"} has been approved for ${route?.name ?? "transport"}.`,
          type: "transport",
          isRead: false,
          createdAt: now,
        }),
      ),
    );
  },
});

export const rejectBooking = mutation({
  args: { bookingId: v.id("transportBookings"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isTransportAdminish(user.role)) throw new Error("Only transport admins can reject bookings.");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");

    await ctx.db.patch(args.bookingId, {
      status: "rejected",
      updatedAt: Date.now(),
      notes: args.note?.trim() || booking.notes,
    });
  },
});

export const recordScan = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    learnerUserId: v.id("users"),
    scanType: v.union(v.literal("board"), v.literal("dropoff")),
    bookingId: v.optional(v.id("transportBookings")),
    locationText: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "driver" && !isTransportAdminish(user.role)) {
      throw new Error("Only drivers and transport admins can record scans.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found.");
    if (user.role === "driver" && route.driverUserId && route.driverUserId !== user._id) {
      throw new Error("You are not assigned to this route.");
    }

    if (args.bookingId) {
      const booking = await ctx.db.get(args.bookingId);
      if (!booking || booking.routeId !== args.routeId || booking.learnerUserId !== args.learnerUserId) {
        throw new Error("Booking does not match the scan.");
      }
    }

    return ctx.db.insert("transportScans", {
      routeId: args.routeId,
      bookingId: args.bookingId,
      learnerUserId: args.learnerUserId,
      driverUserId: user._id,
      scanType: args.scanType,
      scannedAt: Date.now(),
      locationText: args.locationText?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const reportIncident = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    title: v.string(),
    description: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "driver" && !isTransportAdminish(user.role)) {
      throw new Error("Only drivers and transport admins can report incidents.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found.");

    const now = Date.now();
    const incidentId = await ctx.db.insert("transportIncidents", {
      routeId: args.routeId,
      reportedByUserId: user._id,
      title: args.title.trim(),
      description: args.description.trim(),
      status: "open",
      latitude: args.latitude,
      longitude: args.longitude,
      createdAt: now,
      updatedAt: now,
    });

    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    await Promise.all(
      admins
        .filter((admin) => admin.isActive)
        .map((admin) =>
          ctx.db.insert("notifications", {
            userId: admin._id,
            title: "Transport incident reported",
            body: `${route.name}: ${args.title}`,
            type: "transport",
            isRead: false,
            createdAt: now,
          }),
        ),
    );

    return incidentId;
  },
});
