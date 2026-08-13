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
  args: {
    eventId: v.id("events"),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) throw new Error("Event not available.");

    const quantity = Math.max(1, Math.floor(args.quantity ?? 1));

    // Check capacity
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const activeCount = tickets.filter((t) => t.status !== "cancelled").length;
    if (event.capacity && activeCount + quantity > event.capacity) {
      const remaining = Math.max(0, event.capacity - activeCount);
      throw new Error(`Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining for this event.`);
    }

    const createdIds: Id<"eventTickets">[] = [];
    const now = Date.now();

    for (let i = 0; i < quantity; i++) {
      const ticketCode = generateTicketCode();
      const ticketId = await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        userId: user._id,
        ticketCode,
        status: "valid",
        paymentStatus: "free",
        createdAt: now + i,
      });
      createdIds.push(ticketId);

      await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
        to: user.email,
        recipientName: user.fullName ?? user.email,
        eventTitle: event.title,
        eventDate: event.eventDate,
        eventLocation: event.location,
        ticketCode,
        ticketIndex: i + 1,
        totalTickets: quantity,
      });
    }

    return createdIds[0];
  },
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
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserForAction(ctx);
    const event = await ctx.runQuery(internal.events.internalGetEventForPayment, { eventId: args.eventId });
    if (!event || !event.isActive) throw new Error("Event not available.");
    if (!event.ticketPrice || event.ticketPrice <= 0) {
      throw new Error("This event doesn't require payment — use getTicket instead.");
    }

    const quantity = Math.max(1, Math.floor(args.quantity ?? 1));

    if (event.capacity != null) {
      const activeCount = await ctx.runQuery(internal.events.internalCountActiveTickets, { eventId: args.eventId });
      if (activeCount + quantity > event.capacity) {
        const remaining = Math.max(0, event.capacity - activeCount);
        throw new Error(`Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining for this event.`);
      }
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const reference = `eduspace-ticket-${args.eventId}-${Date.now()}`;
    const totalAmount = event.ticketPrice * quantity;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(totalAmount * 100),
        reference,
        callback_url: `${args.origin}/events/callback?eventId=${args.eventId}&quantity=${quantity}`,
        metadata: { eventId: args.eventId, userId: user._id, quantity },
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
      quantity,
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
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const qty = Math.max(1, Math.floor(args.quantity ?? 1));
    const now = Date.now();
    for (let i = 0; i < qty; i++) {
      await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        userId: args.userId,
        ticketCode: generateTicketCode(),
        status: "valid",
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
        createdAt: now + i,
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
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.reference))
      .collect();
    if (tickets.length === 0) throw new Error("No ticket found for this payment reference.");

    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, { paymentStatus: args.status });
    }

    if (args.status === "paid") {
      const firstTicket = tickets[0];
      const event = await ctx.db.get(firstTicket.eventId);
      const user = await ctx.db.get(args.userId);
      const ticketCount = tickets.length;
      await ctx.db.insert("notifications", {
        userId: args.userId,
        title: "Ticket payment confirmed",
        body: ticketCount > 1
          ? `Your ${ticketCount} tickets for ${event?.title ?? "the event"} are ready — find them under My Tickets.`
          : `Your ticket for ${event?.title ?? "the event"} is ready — find it under My Tickets.`,
        type: "system",
        link: "/events",
        isRead: false,
        createdAt: Date.now(),
      });
      if (event && user) {
        let idx = 1;
        for (const ticket of tickets) {
          await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
            to: user.email,
            recipientName: user.fullName ?? user.email,
            eventTitle: event.title,
            eventDate: event.eventDate,
            eventLocation: event.location,
            ticketCode: ticket.ticketCode,
            amount: ticket.amount,
            ticketIndex: idx++,
            totalTickets: ticketCount,
          });
        }
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

export const lookupGuestTickets = query({
  args: { eventId: v.id("events"), guestEmail: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.guestEmail.trim().toLowerCase();
    return ctx.db
      .query("eventTickets")
      .withIndex("by_event_guest_email", (q) => q.eq("eventId", args.eventId).eq("guestEmail", normalized))
      .collect();
  },
});

export const getGuestTicket = mutation({
  args: {
    eventId: v.id("events"),
    guestName: v.string(),
    guestEmail: v.string(),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const guestEmail = args.guestEmail.trim().toLowerCase();
    const guestName = args.guestName.trim();
    if (!guestName || !guestEmail.includes("@")) throw new Error("A valid name and email are required.");

    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) throw new Error("Event not available.");
    if (event.ticketPrice && event.ticketPrice > 0) {
      throw new Error("This event requires payment — use the checkout flow instead.");
    }

    const quantity = Math.max(1, Math.floor(args.quantity ?? 1));

    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const activeCount = tickets.filter((t) => t.status !== "cancelled").length;
    if (event.capacity && activeCount + quantity > event.capacity) {
      const remaining = Math.max(0, event.capacity - activeCount);
      throw new Error(`Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining for this event.`);
    }

    const codes: string[] = [];
    const now = Date.now();
    for (let i = 0; i < quantity; i++) {
      const ticketCode = generateTicketCode();
      codes.push(ticketCode);
      await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        guestName,
        guestEmail,
        ticketCode,
        status: "valid",
        paymentStatus: "free",
        createdAt: now + i,
      });

      await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
        to: guestEmail,
        recipientName: guestName,
        eventTitle: event.title,
        eventDate: event.eventDate,
        eventLocation: event.location,
        ticketCode,
        ticketIndex: i + 1,
        totalTickets: quantity,
      });
    }

    return codes[0];
  },
});

export const initializeGuestTicketCheckout = action({
  args: {
    eventId: v.id("events"),
    guestName: v.string(),
    guestEmail: v.string(),
    origin: v.string(),
    quantity: v.optional(v.number()),
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

    const quantity = Math.max(1, Math.floor(args.quantity ?? 1));

    if (event.capacity != null) {
      const activeCount = await ctx.runQuery(internal.events.internalCountActiveTickets, { eventId: args.eventId });
      if (activeCount + quantity > event.capacity) {
        const remaining = Math.max(0, event.capacity - activeCount);
        throw new Error(`Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining for this event.`);
      }
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");

    const reference = `eduspace-ticket-guest-${args.eventId}-${Date.now()}`;
    const totalAmount = event.ticketPrice * quantity;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: guestEmail,
        amount: Math.round(totalAmount * 100),
        reference,
        callback_url: `${args.origin}/events/callback?eventId=${args.eventId}&guest=1&email=${encodeURIComponent(guestEmail)}&quantity=${quantity}`,
        metadata: { eventId: args.eventId, guestEmail, guestName, quantity },
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
      quantity,
    });

    return { authorizationUrl: result.data.authorization_url, reference: result.data.reference };
  },
});

export const verifyGuestTicketPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; status: string; ticketCode: string | null; ticketCodes?: string[] }> => {
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

    const verificationResult: { ticketCode: string | null; ticketCodes: string[] } = await ctx.runMutation(
      internal.events.internalRecordGuestTicketVerification,
      {
        reference: args.reference,
        status: isSuccess ? "paid" : "failed",
      },
    );

    return {
      ok: isSuccess,
      status: result.data.status ?? "unknown",
      ticketCode: verificationResult.ticketCode,
      ticketCodes: verificationResult.ticketCodes,
    };
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
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const qty = Math.max(1, Math.floor(args.quantity ?? 1));
    const now = Date.now();
    for (let i = 0; i < qty; i++) {
      await ctx.db.insert("eventTickets", {
        eventId: args.eventId,
        guestName: args.guestName,
        guestEmail: args.guestEmail,
        ticketCode: generateTicketCode(),
        status: "valid",
        amount: args.amount,
        paymentStatus: "pending",
        paymentReference: args.reference,
        createdAt: now + i,
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
    const tickets = await ctx.db
      .query("eventTickets")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.reference))
      .collect();
    if (tickets.length === 0) throw new Error("No ticket found for this payment reference.");

    const ticketCodes: string[] = [];
    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, { paymentStatus: args.status });
      ticketCodes.push(ticket.ticketCode);
    }

    if (args.status === "paid") {
      const firstTicket = tickets[0];
      const event = await ctx.db.get(firstTicket.eventId);
      if (event) {
        let idx = 1;
        for (const ticket of tickets) {
          if (ticket.guestEmail) {
            await ctx.scheduler.runAfter(0, internal.emails.sendTicketConfirmation, {
              to: ticket.guestEmail,
              recipientName: ticket.guestName ?? ticket.guestEmail,
              eventTitle: event.title,
              eventDate: event.eventDate,
              eventLocation: event.location,
              ticketCode: ticket.ticketCode,
              amount: ticket.amount,
              ticketIndex: idx++,
              totalTickets: tickets.length,
            });
          }
        }
      }
    }

    return {
      ticketCode: args.status === "paid" && ticketCodes.length > 0 ? ticketCodes[0] : null,
      ticketCodes: args.status === "paid" ? ticketCodes : [],
    };
  },
});
