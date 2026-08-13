import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

async function getCurrentUserForAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in to perform this action.");
  const user = await ctx.runQuery(internal.events.internalGetUserByClerkId, {
    clerkUserId: identity.subject,
  });
  if (!user) throw new Error("No application user record exists for this session.");
  return user;
}

function generateTicketCode() {
  return `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
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

export const createSportsEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    location: v.string(),
    capacity: v.optional(v.number()),
    ticketPrice: v.optional(v.number()),
    sportId: v.optional(v.id("sports")),
    fixtureId: v.optional(v.id("matchFixtures")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "coach" && user.role !== "admin") {
      throw new Error("Only coaches and admins can create sports events.");
    }

    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title.trim(),
      description: args.description.trim(),
      eventDate: args.eventDate,
      location: args.location.trim(),
      capacity: args.capacity,
      ticketPrice: args.ticketPrice,
      sportId: args.sportId,
      fixtureId: args.fixtureId,
      isActive: true,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
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
        await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
          to: user.email,
          recipientName: user.fullName ?? user.email,
          eventTitle: event.title,
          eventDate: event.eventDate,
          eventLocation: event.location,
          ticketCode: existing.ticketCode,
        });
        return existing._id;
      }
      throw new Error("You already have a ticket for this event.");
    }

    // Generate unique code
    const ticketCode = `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const ticketId = await ctx.db.insert("eventTickets", {
      eventId: args.eventId,
      userId: user._id,
      ticketCode,
      status: "valid",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
      to: user.email,
      recipientName: user.fullName ?? user.email,
      eventTitle: event.title,
      eventDate: event.eventDate,
      eventLocation: event.location,
      ticketCode,
    });

    return ticketId;
  }
});

export const scanTicket = mutation({
  args: { ticketCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin" && user.role !== "coach") {
      throw new Error("Only admins and coaches can scan tickets.");
    }

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

    if (ticket.paymentStatus === "pending" || ticket.paymentStatus === "failed") {
      throw new Error("This ticket's payment hasn't been completed yet.");
    }

    const event = await ctx.db.get(ticket.eventId);
    const attendee = ticket.userId ? await ctx.db.get(ticket.userId) : null;

    await ctx.db.patch(ticket._id, {
      status: "scanned",
      scannedAt: Date.now(),
      scannedByUserId: user._id,
    });

    return {
      success: true,
      attendeeName: attendee?.fullName ?? attendee?.email ?? ticket.guestName ?? "Attendee",
      eventName: event?.title ?? "Event",
    };
  }
});

// ── Paid ticket checkout (Paystack) — mirrors convex/payments.ts's
// initializeCheckout/verifyTransaction pattern for enrollment payments. ────

export const initializeTicketCheckout = action({
  args: {
    eventId: v.id("events"),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserForAction(ctx);
    const event = await ctx.runQuery(internal.events.internalGetEventForPayment, { eventId: args.eventId });
    if (!event || !event.isActive) throw new Error("Event not available.");
    if (!event.ticketPrice || event.ticketPrice <= 0) {
      throw new Error("This event doesn't require payment — use getTicket instead.");
    }

    const existing = await ctx.runQuery(internal.events.internalGetMyTicketForEvent, {
      eventId: args.eventId,
      userId: user._id,
    });
    if (existing && existing.status !== "cancelled" && existing.paymentStatus !== "failed") {
      throw new Error("You already have a ticket for this event.");
    }

    if (event.capacity != null) {
      const activeCount = await ctx.runQuery(internal.events.internalCountActiveTickets, { eventId: args.eventId });
      if (activeCount >= event.capacity) throw new Error("Event is fully booked.");
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const reference = `eduspace-ticket-${args.eventId}-${Date.now()}`;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(event.ticketPrice * 100),
        reference,
        callback_url: `${args.origin}/events/callback?eventId=${args.eventId}`,
        metadata: { eventId: args.eventId, userId: user._id },
      }),
    });

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to initialize Paystack checkout.");
    }

    await ctx.runMutation(internal.events.internalRecordInitializedTicket, {
      eventId: args.eventId,
      userId: user._id,
      amount: event.ticketPrice,
      reference: result.data.reference,
    });

    return { authorizationUrl: result.data.authorization_url, reference: result.data.reference };
  },
});

export const verifyTicketPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserForAction(ctx);

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(args.reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { status?: string };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to verify payment with Paystack.");
    }

    const isSuccess = result.data.status === "success";

    await ctx.runMutation(internal.events.internalRecordTicketVerification, {
      reference: args.reference,
      userId: user._id,
      status: isSuccess ? "paid" : "failed",
    });

    return { ok: isSuccess, status: result.data.status ?? "unknown" };
  },
});

export const internalGetUserByClerkId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

export const internalGetEventForPayment = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => ctx.db.get(args.eventId),
});

export const internalGetMyTicketForEvent = internalQuery({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) =>
    ctx.db
      .query("eventTickets")
      .withIndex("by_event_user", (q) => q.eq("eventId", args.eventId).eq("userId", args.userId))
      .first(),
});

export const internalCountActiveTickets = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return tickets.filter((t) => t.status !== "cancelled" && t.paymentStatus !== "failed").length;
  },
});

export const internalRecordInitializedTicket = internalMutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    amount: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_event_user", (q) => q.eq("eventId", args.eventId).eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "valid",
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
      });
    } else {
      await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        userId: args.userId,
        ticketCode: generateTicketCode(),
        status: "valid",
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
        createdAt: Date.now(),
      });
    }
  },
});

export const internalRecordTicketVerification = internalMutation({
  args: {
    reference: v.string(),
    userId: v.id("users"),
    status: v.union(v.literal("paid"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("eventTickets")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.reference))
      .first();
    if (!ticket) throw new Error("No ticket found for this payment reference.");

    await ctx.db.patch(ticket._id, { paymentStatus: args.status });

    if (args.status === "paid") {
      const event = await ctx.db.get(ticket.eventId);
      const user = await ctx.db.get(args.userId);
      await ctx.db.insert("notifications", {
        userId: args.userId,
        title: "Ticket payment confirmed",
        body: `Your ticket for ${event?.title ?? "the event"} is ready — find it under My Tickets.`,
        type: "system",
        link: "/events",
        isRead: false,
        createdAt: Date.now(),
      });
      if (event && user) {
        await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
          to: user.email,
          recipientName: user.fullName ?? user.email,
          eventTitle: event.title,
          eventDate: event.eventDate,
          eventLocation: event.location,
          ticketCode: ticket.ticketCode,
          amount: ticket.amount,
        });
      }
    }
  },
});

// ── Guest (non-platform-user) ticketing — no Clerk identity required at all.
// A guest is identified purely by name + email; nothing here calls
// getCurrentUser/getCurrentUserForAction. ───────────────────────────────────

export const listPublicEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    return events.filter((e) => e.isActive).sort((a, b) => a.eventDate - b.eventDate);
  },
});

export const lookupGuestTicket = query({
  args: { eventId: v.id("events"), guestEmail: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.guestEmail.trim().toLowerCase();
    return ctx.db
      .query("eventTickets")
      .withIndex("by_event_guest_email", (q) => q.eq("eventId", args.eventId).eq("guestEmail", normalized))
      .first();
  },
});

export const getGuestTicket = mutation({
  args: { eventId: v.id("events"), guestName: v.string(), guestEmail: v.string() },
  handler: async (ctx, args) => {
    const guestEmail = args.guestEmail.trim().toLowerCase();
    const guestName = args.guestName.trim();
    if (!guestName || !guestEmail.includes("@")) throw new Error("A valid name and email are required.");

    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) throw new Error("Event not available.");
    if (event.ticketPrice && event.ticketPrice > 0) {
      throw new Error("This event requires payment — use the checkout flow instead.");
    }

    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const activeCount = tickets.filter((t) => t.status !== "cancelled").length;
    if (event.capacity && activeCount >= event.capacity) {
      throw new Error("Event is fully booked.");
    }

    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_event_guest_email", (q) => q.eq("eventId", args.eventId).eq("guestEmail", guestEmail))
      .first();
    if (existing) {
      if (existing.status === "cancelled") {
        await ctx.db.patch(existing._id, { status: "valid", guestName });
        await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
          to: guestEmail,
          recipientName: guestName,
          eventTitle: event.title,
          eventDate: event.eventDate,
          eventLocation: event.location,
          ticketCode: existing.ticketCode,
        });
        return existing.ticketCode;
      }
      return existing.ticketCode; // already has one — just show it again
    }

    const ticketCode = generateTicketCode();
    await ctx.db.insert("eventTickets", {
      eventId: args.eventId,
      guestName,
      guestEmail,
      ticketCode,
      status: "valid",
      paymentStatus: "free",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
      to: guestEmail,
      recipientName: guestName,
      eventTitle: event.title,
      eventDate: event.eventDate,
      eventLocation: event.location,
      ticketCode,
    });

    return ticketCode;
  },
});

export const initializeGuestTicketCheckout = action({
  args: {
    eventId: v.id("events"),
    guestName: v.string(),
    guestEmail: v.string(),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    const guestEmail = args.guestEmail.trim().toLowerCase();
    const guestName = args.guestName.trim();
    if (!guestName || !guestEmail.includes("@")) throw new Error("A valid name and email are required.");

    const event = await ctx.runQuery(internal.events.internalGetEventForPayment, { eventId: args.eventId });
    if (!event || !event.isActive) throw new Error("Event not available.");
    if (!event.ticketPrice || event.ticketPrice <= 0) {
      throw new Error("This event doesn't require payment — use getGuestTicket instead.");
    }

    const existing = await ctx.runQuery(internal.events.internalGetGuestTicketForEvent, {
      eventId: args.eventId,
      guestEmail,
    });
    if (existing && existing.status !== "cancelled" && existing.paymentStatus !== "failed") {
      throw new Error("A ticket for this email already exists for this event.");
    }

    if (event.capacity != null) {
      const activeCount = await ctx.runQuery(internal.events.internalCountActiveTickets, { eventId: args.eventId });
      if (activeCount >= event.capacity) throw new Error("Event is fully booked.");
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const reference = `eduspace-ticket-guest-${args.eventId}-${Date.now()}`;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: guestEmail,
        amount: Math.round(event.ticketPrice * 100),
        reference,
        callback_url: `${args.origin}/events/callback?eventId=${args.eventId}&guest=1&email=${encodeURIComponent(guestEmail)}`,
        metadata: { eventId: args.eventId, guestEmail, guestName },
      }),
    });

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to initialize Paystack checkout.");
    }

    await ctx.runMutation(internal.events.internalRecordInitializedGuestTicket, {
      eventId: args.eventId,
      guestName,
      guestEmail,
      amount: event.ticketPrice,
      reference: result.data.reference,
    });

    return { authorizationUrl: result.data.authorization_url, reference: result.data.reference };
  },
});

export const verifyGuestTicketPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; status: string; ticketCode: string | null }> => {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(args.reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { status?: string };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to verify payment with Paystack.");
    }

    const isSuccess = result.data.status === "success";

    const ticketCode: string | null = await ctx.runMutation(internal.events.internalRecordGuestTicketVerification, {
      reference: args.reference,
      status: isSuccess ? "paid" : "failed",
    });

    return { ok: isSuccess, status: result.data.status ?? "unknown", ticketCode };
  },
});

export const internalGetGuestTicketForEvent = internalQuery({
  args: { eventId: v.id("events"), guestEmail: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("eventTickets")
      .withIndex("by_event_guest_email", (q) => q.eq("eventId", args.eventId).eq("guestEmail", args.guestEmail))
      .first(),
});

export const internalRecordInitializedGuestTicket = internalMutation({
  args: {
    eventId: v.id("events"),
    guestName: v.string(),
    guestEmail: v.string(),
    amount: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_event_guest_email", (q) => q.eq("eventId", args.eventId).eq("guestEmail", args.guestEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "valid",
        guestName: args.guestName,
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
      });
    } else {
      await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        guestName: args.guestName,
        guestEmail: args.guestEmail,
        ticketCode: generateTicketCode(),
        status: "valid",
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
        createdAt: Date.now(),
      });
    }
  },
});

export const internalRecordGuestTicketVerification = internalMutation({
  args: {
    reference: v.string(),
    status: v.union(v.literal("paid"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("eventTickets")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.reference))
      .first();
    if (!ticket) throw new Error("No ticket found for this payment reference.");

    await ctx.db.patch(ticket._id, { paymentStatus: args.status });

    if (args.status === "paid" && ticket.guestEmail) {
      const event = await ctx.db.get(ticket.eventId);
      if (event) {
        await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
          to: ticket.guestEmail,
          recipientName: ticket.guestName ?? ticket.guestEmail,
          eventTitle: event.title,
          eventDate: event.eventDate,
          eventLocation: event.location,
          ticketCode: ticket.ticketCode,
          amount: ticket.amount,
        });
      }
    }

    return args.status === "paid" ? ticket.ticketCode : null;
  },
});
