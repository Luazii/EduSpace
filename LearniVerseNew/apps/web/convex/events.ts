import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

// Utility: get current user
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

// Queries
export const listEvents = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    let events = await ctx.db.query("events").collect();
    
    // Non-admins only see active events
    if (user.role !== "admin" || !args.includeInactive) {
      events = events.filter(e => e.isActive);
    }
    
    // Sort by soonest first
    return events.sort((a, b) => a.eventDate - b.eventDate);
  },
});

export const getEventTicketCounts = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Unauthorized");

    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    return {
      totalIssued: tickets.length,
      valid: tickets.filter(t => t.status === "valid").length,
      scanned: tickets.filter(t => t.status === "scanned").length,
      cancelled: tickets.filter(t => t.status === "cancelled").length,
    };
  }
});

export const listMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    return Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        return { ...ticket, event };
      })
    ).then(res => res.sort((a, b) => (b.event?.eventDate ?? 0) - (a.event?.eventDate ?? 0)));
  }
});

// Mutations
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    location: v.string(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Only admins can create events.");

    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title.trim(),
      description: args.description.trim(),
      eventDate: args.eventDate,
      location: args.location.trim(),
      capacity: args.capacity,
      isActive: true,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  }
});

export const getTicket = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) throw new Error("Event not available.");

    // Check capacity
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();
      
    if (event.capacity && tickets.length >= event.capacity) {
      throw new Error("Event is fully booked.");
    }

    // Check if already has ticket
    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_event_user", q => q.eq("eventId", args.eventId).eq("userId", user._id))
      .first();

    if (existing) {
      if (existing.status === "cancelled") {
        // Re-activate ticket
        await ctx.db.patch(existing._id, { status: "valid" });
        return existing._id;
      }
      throw new Error("You already have a ticket for this event.");
    }

    // Generate unique code
    const ticketCode = `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    return await ctx.db.insert("eventTickets", {
      eventId: args.eventId,
      userId: user._id,
      ticketCode,
      status: "valid",
      createdAt: Date.now(),
    });
  }
});

export const scanTicket = mutation({
  args: { ticketCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") throw new Error("Only admins can scan tickets.");

    const ticket = await ctx.db
      .query("eventTickets")
      .withIndex("by_code", q => q.eq("ticketCode", args.ticketCode.trim()))
      .first();

    if (!ticket) {
      throw new Error("Invalid ticket code. Not found.");
    }

    if (ticket.status === "scanned") {
      throw new Error("Ticket has already been scanned.");
    }
    
    if (ticket.status === "cancelled") {
      throw new Error("Ticket is cancelled and no longer valid.");
    }

    const event = await ctx.db.get(ticket.eventId);
    const attendee = await ctx.db.get(ticket.userId);

    await ctx.db.patch(ticket._id, {
      status: "scanned",
      scannedAt: Date.now(),
      scannedByUserId: user._id,
    });

    return {
      success: true,
      attendeeName: attendee?.fullName ?? attendee?.email ?? "Attendee",
      eventName: event?.title ?? "Event",
    };
  }
});
