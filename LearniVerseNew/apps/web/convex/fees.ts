import { ConvexError, v } from "convex/values";

import { action, internalMutation, internalQuery, mutation, query, type ActionCtx, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) throw new Error("No application user record exists for this session.");
  return user;
}

async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") throw new Error("Only admins can manage fee records.");
  return user;
}

function buildInvoiceNumber() {
  return `INV-${Date.now()}`;
}

function buildReceiptNumber() {
  return `RCT-${Date.now()}`;
}

export const listStructures = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query("feeStructures").collect();
  },
});

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const invoices = await ctx.db.query("feeInvoices").collect();

    return await Promise.all(
      invoices
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (invoice) => ({
          ...invoice,
          student: await ctx.db.get(invoice.studentUserId),
          class: invoice.classId ? await ctx.db.get(invoice.classId) : null,
          structure: await ctx.db.get(invoice.feeStructureId),
        })),
    );
  },
});

export const listReceipts = query({
  args: { invoiceId: v.optional(v.id("feeInvoices")) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const receipts = args.invoiceId
      ? await ctx.db
          .query("feeReceipts")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId!))
          .collect()
      : await ctx.db.query("feeReceipts").collect();

    return await Promise.all(
      receipts
        .sort((a, b) => b.receivedAt - a.receivedAt)
        .map(async (receipt) => ({
          ...receipt,
          student: await ctx.db.get(receipt.studentUserId),
          invoice: await ctx.db.get(receipt.invoiceId),
        })),
    );
  },
});

export const getInvoiceById = query({
  args: { invoiceId: v.id("feeInvoices") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;
    return {
      ...invoice,
      student: await ctx.db.get(invoice.studentUserId),
      class: invoice.classId ? await ctx.db.get(invoice.classId) : null,
      structure: await ctx.db.get(invoice.feeStructureId),
    };
  },
});

export const getReceiptById = query({
  args: { receiptId: v.id("feeReceipts") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;
    return {
      ...receipt,
      student: await ctx.db.get(receipt.studentUserId),
      invoice: await ctx.db.get(receipt.invoiceId),
    };
  },
});

export const listMineInvoices = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student") return [];
    const invoices = await ctx.db
      .query("feeInvoices")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    return await Promise.all(
      invoices
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (invoice) => ({
          ...invoice,
          structure: await ctx.db.get(invoice.feeStructureId),
          class: invoice.classId ? await ctx.db.get(invoice.classId) : null,
        })),
    );
  },
});

export const listMineReceipts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student") return [];
    const receipts = await ctx.db
      .query("feeReceipts")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();
    return await Promise.all(
      receipts
        .sort((a, b) => b.receivedAt - a.receivedAt)
        .map(async (receipt) => ({
          ...receipt,
          invoice: await ctx.db.get(receipt.invoiceId),
        })),
    );
  },
});

export const createStructure = mutation({
  args: {
    name: v.string(),
    gradeName: v.string(),
    academicYear: v.string(),
    tuitionAmount: v.number(),
    registrationAmount: v.number(),
    otherAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("feeStructures", {
      ...args,
      name: args.name.trim(),
      gradeName: args.gradeName.trim(),
      academicYear: args.academicYear.trim(),
      notes: args.notes?.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createInvoice = mutation({
  args: {
    studentUserId: v.id("users"),
    classId: v.optional(v.id("classes")),
    feeStructureId: v.id("feeStructures"),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const structure = await ctx.db.get(args.feeStructureId);
    if (!structure) throw new Error("Fee structure not found.");

    const lineItems = [
      { label: "Tuition", amount: structure.tuitionAmount },
      { label: "Registration", amount: structure.registrationAmount },
      { label: "Other", amount: structure.otherAmount },
    ].filter((item) => item.amount > 0);

    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const now = Date.now();

    return await ctx.db.insert("feeInvoices", {
      studentUserId: args.studentUserId,
      classId: args.classId,
      feeStructureId: args.feeStructureId,
      invoiceNumber: buildInvoiceNumber(),
      academicYear: structure.academicYear,
      lineItems,
      totalAmount,
      amountPaid: 0,
      balance: totalAmount,
      dueDate: args.dueDate,
      status: "issued",
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const capturePayment = mutation({
  args: {
    invoiceId: v.id("feeInvoices"),
    amount: v.number(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("eft"),
      v.literal("card"),
      v.literal("paystack"),
    ),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (args.amount <= 0) throw new Error("Payment amount must be greater than zero.");
    if (args.amount > invoice.balance) throw new Error("Payment cannot exceed invoice balance.");

    const newAmountPaid = invoice.amountPaid + args.amount;
    const newBalance = invoice.totalAmount - newAmountPaid;
    const newStatus = newBalance <= 0 ? "paid" : "partially_paid";
    const now = Date.now();

    const receiptId = await ctx.db.insert("feeReceipts", {
      invoiceId: invoice._id,
      studentUserId: invoice.studentUserId,
      receiptNumber: buildReceiptNumber(),
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      reference: args.reference?.trim(),
      receivedByUserId: admin._id,
      receivedAt: now,
      createdAt: now,
    });

    await ctx.db.patch(invoice._id, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      updatedAt: now,
    });

    return receiptId;
  },
});

// ── Parent: view invoices for linked students ─────────────────────────────────

export const listParentInvoices = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "parent" && user.role !== "student") return [];

    let studentIds: Id<"users">[] = [];
    if (user.role === "parent") {
      const links = await ctx.db
        .query("parentStudentLinks")
        .withIndex("by_parent", (q) => q.eq("parentId", user._id))
        .collect();
      studentIds = links.map((l) => l.studentId);
    } else {
      studentIds = [user._id];
    }

    const allInvoices = [];
    for (const sid of studentIds) {
      const student = await ctx.db.get(sid);
      const invoices = await ctx.db
        .query("feeInvoices")
        .withIndex("by_student", (q) => q.eq("studentUserId", sid))
        .collect();
      for (const inv of invoices) {
        allInvoices.push({ ...inv, student, structure: await ctx.db.get(inv.feeStructureId) });
      }
    }
    return allInvoices.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ── Internal helpers for fee Paystack checkout ────────────────────────────────

export const internalGetInvoice = internalQuery({
  args: { invoiceId: v.id("feeInvoices") },
  handler: async (ctx, args) => ctx.db.get(args.invoiceId),
});

export const internalGetUserByClerkId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId)).first(),
});

export const internalRecordFeePayment = internalMutation({
  args: {
    invoiceId: v.id("feeInvoices"),
    amount: v.number(),
    reference: v.string(),
    payerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");

    const applyAmount = Math.min(args.amount, invoice.balance);
    const newAmountPaid = invoice.amountPaid + applyAmount;
    const newBalance = invoice.totalAmount - newAmountPaid;
    const now = Date.now();

    await ctx.db.insert("feeReceipts", {
      invoiceId: args.invoiceId,
      studentUserId: invoice.studentUserId,
      receiptNumber: `RCT-${Date.now()}`,
      amount: applyAmount,
      paymentMethod: "paystack",
      reference: args.reference,
      receivedByUserId: args.payerUserId,
      receivedAt: now,
      createdAt: now,
    });

    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : "partially_paid",
      updatedAt: now,
    });
  },
});

// ── Parent: Paystack checkout for a fee invoice ───────────────────────────────

export const initializeFeeCheckout = action({
  args: { invoiceId: v.id("feeInvoices"), origin: v.string() },
  handler: async (ctx: ActionCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in.");

    const user = await ctx.runQuery(internal.fees.internalGetUserByClerkId, {
      clerkUserId: identity.subject,
    });
    if (!user) throw new Error("No user record found.");
    if (user.role !== "parent" && user.role !== "student") throw new Error("Only parents/students can pay invoices.");

    const invoice = await ctx.runQuery(internal.fees.internalGetInvoice, { invoiceId: args.invoiceId });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.balance <= 0) throw new Error("Invoice is already fully paid.");

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new ConvexError("PAYSTACK_SECRET_KEY not configured.");

    const reference = `fee-${args.invoiceId}-${Date.now()}`;
    const amountKobo = invoice.balance * 100;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        reference,
        callback_url: `${args.origin}/parent/fees/callback?invoiceId=${args.invoiceId}`,
        metadata: { invoiceId: args.invoiceId, userId: user._id },
      }),
    });

    const json = (await res.json()) as { status: boolean; data?: { authorization_url: string; access_code: string } };
    if (!json.status || !json.data) throw new Error("Paystack initialization failed.");

    return { authorizationUrl: json.data.authorization_url, reference };
  },
});

export const verifyFeePayment = action({
  args: { reference: v.string(), invoiceId: v.id("feeInvoices") },
  handler: async (ctx: ActionCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in.");

    const user = await ctx.runQuery(internal.fees.internalGetUserByClerkId, {
      clerkUserId: identity.subject,
    });
    if (!user) throw new Error("No user record found.");

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new ConvexError("PAYSTACK_SECRET_KEY not configured.");

    const res = await fetch(`https://api.paystack.co/transaction/verify/${args.reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await res.json()) as { status: boolean; data?: { status: string; amount: number; reference: string } };

    if (!json.status || json.data?.status !== "success") {
      return { success: false, message: "Payment not confirmed by Paystack." };
    }

    const amountPaid = json.data.amount / 100;
    await ctx.runMutation(internal.fees.internalRecordFeePayment, {
      invoiceId: args.invoiceId,
      amount: amountPaid,
      reference: args.reference,
      payerUserId: user._id,
    });

    return { success: true, amountPaid };
  },
});
