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

function todayDateString() {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

function daysOverlap(a?: string[], b?: string[]) {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  return a.some((d) => b.includes(d));
}

async function notifyUser(ctx: MutationCtx, userId: Id<"users">, title: string, body: string) {
  await ctx.db.insert("notifications", {
    userId,
    title,
    body,
    type: "transport",
    isRead: false,
    createdAt: Date.now(),
  });
}

async function notifyLearnerAndParents(ctx: MutationCtx, learnerUserId: Id<"users">, title: string, body: string) {
  const recipients = new Set<Id<"users">>([learnerUserId]);
  const links = await ctx.db
    .query("parentStudentLinks")
    .withIndex("by_student", (q) => q.eq("studentId", learnerUserId))
    .collect();
  for (const link of links) recipients.add(link.parentId);
  await Promise.all([...recipients].map((userId) => notifyUser(ctx, userId, title, body)));
}

// Check the driver isn't already scheduled on another active route at an
// overlapping day/time — wires up what was previously a dead-schema check.
async function checkDriverScheduleConflict(
  ctx: MutationCtx,
  driverUserId: Id<"users"> | undefined,
  scheduleDays: string[] | undefined,
  scheduleTime: string | undefined,
  excludeRouteId?: Id<"transportRoutes">,
) {
  if (!driverUserId || !scheduleDays?.length || !scheduleTime) return;
  const driverRoutes = await ctx.db
    .query("transportRoutes")
    .withIndex("by_driver", (q) => q.eq("driverUserId", driverUserId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();
  const conflict = driverRoutes.find(
    (r) => r._id !== excludeRouteId && r.scheduleTime === scheduleTime && daysOverlap(r.scheduleDays, scheduleDays),
  );
  if (conflict) {
    throw new Error(`This driver already runs route ${conflict.routeCode} at ${scheduleTime} on an overlapping day.`);
  }
}

// Keeps the (previously entirely unused) busAssignments table as the real
// daily operational record: which driver/bus is actually on a route today,
// and catches a driver being double-assigned to two routes on the same day.
async function upsertTodayBusAssignment(
  ctx: MutationCtx,
  routeId: Id<"transportRoutes">,
  driverUserId: Id<"users">,
  busLabel: string | undefined,
  assignedByUserId: Id<"users">,
) {
  const today = todayDateString();
  const driverAssignmentsToday = await ctx.db
    .query("busAssignments")
    .withIndex("by_driver", (q) => q.eq("driverUserId", driverUserId))
    .filter((q) => q.eq(q.field("assignmentDate"), today))
    .collect();
  const conflict = driverAssignmentsToday.find((a) => a.status === "active" && a.routeId !== routeId);
  if (conflict) {
    throw new Error("This driver is already actively assigned to a different route today.");
  }

  const existing = await ctx.db
    .query("busAssignments")
    .withIndex("by_route", (q) => q.eq("routeId", routeId))
    .filter((q) => q.eq(q.field("assignmentDate"), today))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { driverUserId, busLabel: busLabel ?? existing.busLabel, status: "active" });
  } else {
    await ctx.db.insert("busAssignments", {
      routeId,
      driverUserId,
      busLabel: busLabel ?? "Unassigned",
      assignmentDate: today,
      status: "active",
      assignedByUserId,
      createdAt: Date.now(),
    });
  }
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
    // @ts-expect-error - driver is definitely a user
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
        if (!learner) continue;
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
    scheduleDays: v.optional(v.array(v.string())),
    scheduleTime: v.optional(v.string()),
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

    await checkDriverScheduleConflict(ctx, args.driverUserId, args.scheduleDays, args.scheduleTime);

    const now = Date.now();
    const routeId = await ctx.db.insert("transportRoutes", {
      routeCode,
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      serviceType: args.serviceType,
      capacity: args.capacity,
      driverUserId: args.driverUserId,
      busLabel: args.busLabel?.trim() || undefined,
      scheduleDays: args.scheduleDays,
      scheduleTime: args.scheduleTime,
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

    if (args.driverUserId) {
      await upsertTodayBusAssignment(ctx, routeId, args.driverUserId, args.busLabel, user._id);
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
    scheduleDays: v.optional(v.array(v.string())),
    scheduleTime: v.optional(v.string()),
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

    const nextDriverId = args.driverUserId ?? route.driverUserId;
    const nextDays = args.scheduleDays ?? route.scheduleDays;
    const nextTime = args.scheduleTime ?? route.scheduleTime;
    await checkDriverScheduleConflict(ctx, nextDriverId, nextDays, nextTime, route._id);

    const now = Date.now();

    // Detect what's meaningfully changing before patching, so we can notify
    // affected riders about the actual change (UC16) rather than nothing.
    const changes: string[] = [];
    if (args.driverUserId !== undefined && args.driverUserId !== route.driverUserId) changes.push("driver reassigned");
    if (args.busLabel !== undefined && args.busLabel !== route.busLabel) changes.push(`bus changed to ${args.busLabel}`);
    if (args.isActive === false && route.isActive) changes.push("route deactivated");
    if (args.stops) changes.push("stops updated");

    await ctx.db.patch(args.routeId, {
      routeCode: args.routeCode?.trim().toUpperCase(),
      name: args.name?.trim(),
      description: args.description?.trim(),
      serviceType: args.serviceType,
      capacity: args.capacity,
      driverUserId: args.driverUserId,
      busLabel: args.busLabel?.trim(),
      scheduleDays: args.scheduleDays,
      scheduleTime: args.scheduleTime,
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

    if (args.driverUserId) {
      await upsertTodayBusAssignment(ctx, args.routeId, args.driverUserId, args.busLabel ?? route.busLabel, user._id);
    }

    if (changes.length > 0) {
      const approvedBookings = await ctx.db
        .query("transportBookings")
        .withIndex("by_route_and_status", (q) => q.eq("routeId", args.routeId).eq("status", "approved"))
        .collect();
      const summary = changes.join(", ");
      await Promise.all(
        approvedBookings.map((b) =>
          notifyLearnerAndParents(
            ctx,
            b.learnerUserId,
            "Transport route updated",
            `${route.name}: ${summary}.`,
          ),
        ),
      );
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
  args: {
    bookingId: v.id("transportBookings"),
    note: v.optional(v.string()),
    // Lets the admin actually assign/reassign which route the learner rides,
    // not just rubber-stamp whatever the parent originally picked.
    routeId: v.optional(v.id("transportRoutes")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isTransportAdminish(user.role)) throw new Error("Only transport admins can approve bookings.");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");

    const targetRouteId = args.routeId ?? booking.routeId;
    const route = await ctx.db.get(targetRouteId);
    if (!route || !route.isActive) throw new Error("Target route not found or inactive.");

    // Capacity check — capacity was stored but never actually enforced before.
    if (route.capacity != null) {
      const approvedOnRoute = await ctx.db
        .query("transportBookings")
        .withIndex("by_route_and_status", (q) => q.eq("routeId", targetRouteId).eq("status", "approved"))
        .collect();
      const alreadyOnThisRoute = approvedOnRoute.some((b) => b._id === booking._id);
      if (!alreadyOnThisRoute && approvedOnRoute.length >= route.capacity) {
        throw new Error(`${route.name} is at capacity (${route.capacity}) — reassign to a different route or increase capacity.`);
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.bookingId, {
      routeId: targetRouteId,
      status: "approved",
      approvedByUserId: user._id,
      approvedAt: now,
      updatedAt: now,
      notes: args.note?.trim() || booking.notes,
    });

    const learner = await ctx.db.get(booking.learnerUserId);
    const recipients = new Set([booking.requestedByUserId, booking.learnerUserId]);

    await Promise.all(
      [...recipients].map((userId) =>
        ctx.db.insert("notifications", {
          userId,
          title: "Transport booking approved",
          body: `${learner?.fullName ?? learner?.email ?? "A learner"} has been approved for ${route.name}.`,
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

    const route = await ctx.db.get(booking.routeId);
    await notifyUser(
      ctx,
      booking.requestedByUserId,
      "Transport booking rejected",
      `Your transport request${route ? ` for ${route.name}` : ""} was not approved.${args.note ? ` Note: ${args.note}` : ""}`,
    );
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

    // Notify admins AND transport admins — previously admin-only, which
    // silently excluded the role actually responsible for transport.
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    const transportAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "transport_admin"))
      .collect();

    await Promise.all(
      [...admins, ...transportAdmins]
        .filter((a) => a.isActive)
        .map((a) =>
          ctx.db.insert("notifications", {
            userId: a._id,
            title: "Transport incident reported",
            body: `${route.name}: ${args.title}`,
            type: "transport",
            isRead: false,
            createdAt: now,
          }),
        ),
    );

    // Notify the learners (and their parents) actually booked on this route —
    // the UI has always claimed this happens; it never actually did.
    const approvedBookings = await ctx.db
      .query("transportBookings")
      .withIndex("by_route_and_status", (q) => q.eq("routeId", args.routeId).eq("status", "approved"))
      .collect();
    await Promise.all(
      approvedBookings.map((b) =>
        notifyLearnerAndParents(
          ctx,
          b.learnerUserId,
          "Transport incident on your route",
          `${route.name}: ${args.title}. ${args.description}`,
        ),
      ),
    );

    return incidentId;
  },
});

export const scanBusPassengerByQR = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    scanCode: v.string(),
    scanType: v.union(v.literal("board"), v.literal("dropoff")),
    locationText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "driver" && !isTransportAdminish(user.role)) {
      throw new Error("Only drivers and transport admins can record scans.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found.");

    const rawCode = args.scanCode.trim();
    let profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_scan_code", (q) => q.eq("scanCode", rawCode))
      .first();

    // Fallback: check if the QR contains student user's email or direct ID
    if (!profile) {
      const studentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", rawCode.toLowerCase()))
        .first();
      if (studentUser) {
        profile = await ctx.db
          .query("studentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", studentUser._id))
          .first();
      }
    }

    if (!profile) {
      throw new Error("Unrecognized code — no registered student found for this QR code.");
    }
    const learnerUserId = profile.userId;

    // Check if the learner is booked on this route
    const bookings = await ctx.db
      .query("transportBookings")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .filter((q) => q.eq(q.field("learnerUserId"), learnerUserId))
      .collect();

    const activeBooking = bookings.find((b) => b.status === "approved" || b.status === "pending");
    let scanNote: string | undefined = undefined;

    if (!activeBooking) {
      // Check if student has a booking on another route
      const allStudentBookings = await ctx.db
        .query("transportBookings")
        .withIndex("by_learner", (q) => q.eq("learnerUserId", learnerUserId))
        .collect();
      const otherActiveBooking = allStudentBookings.find((b) => b.status === "approved" || b.status === "pending");

      if (otherActiveBooking) {
        const otherRoute = await ctx.db.get(otherActiveBooking.routeId);
        scanNote = `Booked on ${otherRoute?.name ?? "another route"}`;
      } else {
        scanNote = "Walk-on passenger";
      }
    }

    const learner = await ctx.db.get(learnerUserId);

    await ctx.db.insert("transportScans", {
      routeId: args.routeId,
      bookingId: activeBooking?._id,
      learnerUserId,
      driverUserId: user._id,
      scanType: args.scanType,
      scannedAt: Date.now(),
      locationText: args.locationText?.trim() || undefined,
      notes: scanNote,
    });

    const action = args.scanType === "board" ? "boarded" : "got off";
    const noteSuffix = scanNote ? ` (${scanNote})` : "";
    await notifyLearnerAndParents(
      ctx,
      learnerUserId,
      args.scanType === "board" ? "Bus boarding confirmed" : "Bus drop-off confirmed",
      `${learner?.fullName ?? learner?.email ?? "Your learner"} just ${action} ${route.name}${noteSuffix} at ${new Date(Date.now()).toLocaleTimeString()}.`,
    );

    return {
      ...learner,
      scanNote,
    };
  },
});

// ── UC-14: Bus GPS location ─────────────────────────────────────────────────
// Haversine distance between two lat/lng points, in kilometers.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const pingLocation = mutation({
  args: {
    routeId: v.id("transportRoutes"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found.");
    if (route.driverUserId !== user._id && !isTransportAdminish(user.role)) {
      throw new Error("You are not assigned to this route.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("busLocations")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .first();

    // Real physics from consecutive pings — not simulated: speed derived
    // from Haversine distance between the last two recorded positions and
    // the elapsed time between them.
    let speedKmh: number | null = null;
    if (existing) {
      const distanceKm = haversineKm(existing.latitude, existing.longitude, args.latitude, args.longitude);
      const elapsedHours = (now - existing.recordedAt) / (1000 * 60 * 60);
      if (elapsedHours > 0) speedKmh = Math.round((distanceKm / elapsedHours) * 10) / 10;

      await ctx.db.patch(existing._id, {
        driverUserId: user._id,
        latitude: args.latitude,
        longitude: args.longitude,
        recordedAt: now,
      });
    } else {
      await ctx.db.insert("busLocations", {
        routeId: args.routeId,
        driverUserId: user._id,
        latitude: args.latitude,
        longitude: args.longitude,
        recordedAt: now,
      });
    }

    return { speedKmh };
  },
});

export const getRouteLocation = query({
  args: { routeId: v.id("transportRoutes") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const location = await ctx.db
      .query("busLocations")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .first();
    if (!location) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      recordedAt: location.recordedAt,
      mapsUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
    };
  },
});
