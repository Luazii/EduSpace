import { ConvexError, v } from "convex/values";

import {
  action,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";

async function getCurrentUserForQuery(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

async function getCurrentUserForAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in to perform this action.");
  }

  const user = await ctx.runQuery(internal.payments.internalGetUserByClerkId, {
    clerkUserId: identity.subject,
  });

  if (!user) {
    throw new Error("No application user record exists for this session.");
  }

  return user;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserForQuery(ctx);

    if (!user) {
      return [];
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_student", (q) => q.eq("studentUserId", user._id))
      .collect();

    return await Promise.all(
      payments
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (payment) => {
          const application = await ctx.db.get(payment.applicationId);
          const qualification = application?.qualificationId
            ? await ctx.db.get(application.qualificationId)
            : null;

          return {
            ...payment,
            application: application
              ? {
                  ...application,
                  qualification,
                }
              : null,
          };
        }),
    );
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserForQuery(ctx);

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can view payment records.");
    }

    const payments = await ctx.db.query("payments").collect();

    return await Promise.all(
      payments
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (payment) => {
          const application = await ctx.db.get(payment.applicationId);
          const qualification = application?.qualificationId
            ? await ctx.db.get(application.qualificationId)
            : null;
          const student = await ctx.db.get(payment.studentUserId);

          return {
            ...payment,
            application: application
              ? {
                  ...application,
                  qualification,
                }
              : null,
            student,
          };
        }),
    );
  },
});

export const getFinancialSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserForQuery(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const payments = await ctx.db.query("payments").collect();

    const totalRevenue = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const pendingFunds = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const successCount = payments.filter((p) => p.status === "success").length;
    const totalCount = payments.length;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      totalRevenue,
      pendingFunds,
      successRate: Math.round(successRate),
      transactionCount: totalCount,
    };
  },
});

export const initializeCheckout = action({
  args: {
    applicationId: v.id("enrollmentApplications"),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserForAction(ctx);
    const application = await ctx.runQuery(internal.payments.internalGetApplicationForPayment, {
      applicationId: args.applicationId,
    });

    if (!application || application.studentUserId !== user._id) {
      throw new Error("Application not found.");
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");
    }

    const reference = `eduspace-${application._id}-${Date.now()}`;
    const amount = application.totalAmount ?? 0;

    if (amount <= 0) {
      throw new Error("Application total is zero. Add priced courses before checkout.");
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${args.origin}/payments/callback?applicationId=${application._id}`,
        metadata: {
          applicationId: application._id,
          studentUserId: user._id,
        },
      }),
    });

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to initialize Paystack checkout.");
    }

    await ctx.runMutation(internal.payments.internalRecordInitializedPayment, {
      applicationId: application._id,
      studentUserId: user._id,
      amount,
      reference: result.data.reference,
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
    });

    return {
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
    };
  },
});

export const verifyTransaction = action({
  args: {
    applicationId: v.id("enrollmentApplications"),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserForAction(ctx);
    const application = await ctx.runQuery(internal.payments.internalGetApplicationForPayment, {
      applicationId: args.applicationId,
    });

    if (!application || application.studentUserId !== user._id) {
      throw new Error("Application not found.");
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      throw new ConvexError("PAYSTACK_SECRET_KEY is not configured yet.");
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(args.reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      },
    );

    const result = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        status?: string;
        paid_at?: string;
        channel?: string;
        gateway_response?: string;
      };
    };

    if (!result.status || !result.data) {
      throw new Error(result.message ?? "Unable to verify payment with Paystack.");
    }

    const isSuccess = result.data.status === "success";

    await ctx.runMutation(internal.payments.internalRecordVerificationResult, {
      applicationId: application._id,
      studentUserId: user._id,
      reference: args.reference,
      status: isSuccess ? "success" : "failed",
      channel: result.data.channel,
      gatewayResponse: result.data.gateway_response,
      paidAt: result.data.paid_at ? new Date(result.data.paid_at).getTime() : undefined,
    });

    return {
      ok: isSuccess,
      status: result.data.status ?? "unknown",
    };
  },
});

export const internalGetUserByClerkId = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

export const internalGetApplicationForPayment = internalQuery({
  args: {
    applicationId: v.id("enrollmentApplications"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    const courses = await Promise.all(
      application.selectedCourseIds.map((courseId) => ctx.db.get(courseId)),
    );

    const BASE_APPLICATION_FEE = 7500;
    return {
      ...application,
      totalAmount: BASE_APPLICATION_FEE + courses
        .filter(Boolean)
        .reduce((sum, course) => sum + (course?.price ?? 0), 0),
    };
  },
});

export const internalRecordInitializedPayment = internalMutation({
  args: {
    applicationId: v.id("enrollmentApplications"),
    studentUserId: v.id("users"),
    amount: v.number(),
    reference: v.string(),
    authorizationUrl: v.string(),
    accessCode: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "pending",
        authorizationUrl: args.authorizationUrl,
        accessCode: args.accessCode,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("payments", {
        applicationId: args.applicationId,
        studentUserId: args.studentUserId,
        provider: "paystack",
        reference: args.reference,
        amount: args.amount,
        currency: "ZAR",
        status: "pending",
        authorizationUrl: args.authorizationUrl,
        accessCode: args.accessCode,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.applicationId, {
      paymentStatus: "pending",
      updatedAt: now,
    });
  },
});

export const internalRecordVerificationResult = internalMutation({
  args: {
    applicationId: v.id("enrollmentApplications"),
    studentUserId: v.id("users"),
    reference: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    channel: v.optional(v.string()),
    gatewayResponse: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    const now = Date.now();

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: args.status,
        channel: args.channel,
        gatewayResponse: args.gatewayResponse,
        paidAt: args.paidAt,
        verifiedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("payments", {
        applicationId: args.applicationId,
        studentUserId: args.studentUserId,
        provider: "paystack",
        reference: args.reference,
        amount: 0,
        currency: "ZAR",
        status: args.status,
        channel: args.channel,
        gatewayResponse: args.gatewayResponse,
        paidAt: args.paidAt,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.applicationId, {
      paymentStatus: args.status === "success" ? "paid" : "pending",
      updatedAt: now,
    });
  },
});
