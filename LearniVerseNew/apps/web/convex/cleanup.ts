import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const wipeUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let deletedCount = 0;

    for (const u of users) {
      const email = (u.email || "").toLowerCase();
      const name = (u.fullName || u.firstName || "").toLowerCase();

      if (email.includes("gumbi") || email.includes("lwazi") || name.includes("gumbi") || name.includes("lwazi")) {
        // Delete all related records
        
        // 1. parentStudentLinks
        const parentLinks = await ctx.db.query("parentStudentLinks").withIndex("by_parent", q => q.eq("parentId", u._id)).collect();
        const studentLinks = await ctx.db.query("parentStudentLinks").filter(q => q.eq(q.field("studentId"), u._id)).collect();
        for (const l of [...parentLinks, ...studentLinks]) await ctx.db.delete(l._id);

        // 2. enrollments
        const enrollments = await ctx.db.query("enrollments").withIndex("by_student", q => q.eq("studentUserId", u._id)).collect();
        for (const e of enrollments) await ctx.db.delete(e._id);

        // 3. teacher profiles
        const tProfiles = await ctx.db.query("teacherProfiles").withIndex("by_user_id", q => q.eq("userId", u._id)).collect();
        for (const p of tProfiles) await ctx.db.delete(p._id);

        // 4. behaviour records
        const behaviours = await ctx.db.query("behaviourRecords").withIndex("by_student", q => q.eq("studentUserId", u._id)).collect();
        for (const b of behaviours) await ctx.db.delete(b._id);

        // 5. final marks
        const marks = await ctx.db.query("finalMarks").withIndex("by_student", q => q.eq("studentUserId", u._id)).collect();
        for (const m of marks) await ctx.db.delete(m._id);

        // 6. live sessions
        const sessions = await ctx.db.query("liveSessions").filter(q => q.eq(q.field("scheduledByUserId"), u._id)).collect();
        for (const s of sessions) await ctx.db.delete(s._id);
        
        // 7. assignments
        const assignments = await ctx.db.query("assignments").filter(q => q.eq(q.field("createdByUserId"), u._id)).collect();
        for (const a of assignments) await ctx.db.delete(a._id);

        // 8. delete user
        await ctx.db.delete(u._id);
        deletedCount++;
      }
    }

    return { message: `Deleted ${deletedCount} users and their related data from Convex.` };
  }
});
