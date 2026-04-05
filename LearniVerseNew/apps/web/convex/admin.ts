import { v } from "convex/values";
import { query, type QueryCtx, type MutationCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can view institutional statistics.");
    }

    const allUsers = await ctx.db.query("users").collect();
    const students = allUsers.filter(u => u.role === "student");
    const teachers = allUsers.filter(u => u.role === "teacher");
    
    const courses = await ctx.db.query("courses").collect();
    const faculties = await ctx.db.query("faculties").collect();
    const qualifications = await ctx.db.query("qualifications").collect();
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "success"))
      .collect();
    
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAdmissions = await ctx.db
      .query("enrollmentApplications")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    // Group payments by date for 7-day trend
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentPayments = payments.filter(p => p.paidAt && p.paidAt > sevenDaysAgo);
    
    return {
      studentCount: students.length,
      teacherCount: teachers.length,
      courseCount: courses.length,
      facultyCount: faculties.length,
      qualificationCount: qualifications.length,
      totalRevenue,
      recentPaymentsCount: recentPayments.length,
      pendingAdmissionsCount: pendingAdmissions.length,
    };
  },
});

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const limit = args.limit ?? 5;

    const applications = await ctx.db
      .query("enrollmentApplications")
      .order("desc")
      .take(limit);

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const student = await ctx.db.get(app.studentUserId);
        const faculty = await ctx.db.get(app.facultyId);
        return {
          ...app,
          studentName: student?.fullName || student?.email,
          facultyName: faculty?.name,
        };
      })
    );

    const payments = await ctx.db
      .query("payments")
      .order("desc")
      .take(limit);

    const enrichedPayments = await Promise.all(
      payments.map(async (p) => {
        const student = await ctx.db.get(p.studentUserId);
        return {
          ...p,
          studentName: student?.fullName || student?.email,
        };
      })
    );

    return {
      applications: enrichedApplications,
      payments: enrichedPayments,
    };
  },
});
