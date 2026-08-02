import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const fixStudent = mutation({
  args: { studentEmailOrName: v.string(), parentEmail: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { studentEmailOrName, parentEmail } = args;

    // 1. Find parent
    const parent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", parentEmail.toLowerCase()))
      .first();

    if (!parent) {
      throw new Error(`Parent with email ${parentEmail} not found`);
    }

    // Ensure parent role
    if (parent.role !== "parent" && parent.role !== "admin" && parent.role !== "teacher") {
       await ctx.db.patch(parent._id, { role: "parent", availableRoles: [...(parent.availableRoles || []), "parent"] });
    }

    // 2. Find student
    const users = await ctx.db.query("users").collect();
    let student = users.find(u => 
      u.email.toLowerCase().includes(studentEmailOrName.toLowerCase()) || 
      (u.fullName && u.fullName.toLowerCase().includes(studentEmailOrName.toLowerCase())) ||
      (u.firstName && u.firstName.toLowerCase().includes(studentEmailOrName.toLowerCase()))
    );

    if (!student) {
      // If student not found, let's create a placeholder for them so the parent can see them
      const studentId = await ctx.db.insert("users", {
        clerkUserId: `seed_placeholder_student_${Date.now()}`,
        email: `${studentEmailOrName.replace(/\s+/g, '').toLowerCase()}@learnmanage.dev`,
        firstName: studentEmailOrName,
        fullName: studentEmailOrName,
        role: "student",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      student = (await ctx.db.get(studentId))!;
    } else {
       // ensure role is student
       if (student.role !== "student") {
         await ctx.db.patch(student._id, { role: "student" });
       }
    }

    // 3. Link parent and student
    const existingLink = await ctx.db
      .query("parentStudentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .filter((q) => q.eq(q.field("studentId"), student!._id))
      .first();

    if (!existingLink) {
      await ctx.db.insert("parentStudentLinks", {
        parentId: parent._id,
        studentId: student._id,
        relationship: "Parent",
        createdAt: now,
      });
    }

    // 4. Enroll student in the Global Learner Access courses so they have material
    // and also in some standard grade courses
    let enrolledCourses = 0;
    const allCourses = await ctx.db.query("courses").collect();
    
    // Find some active published courses
    const coursesToEnroll = allCourses.filter(c => c.isPublished);
    
    for (const course of coursesToEnroll) {
       const existingEnrollment = await ctx.db
         .query("enrollments")
         .withIndex("by_student", (q) => q.eq("studentUserId", student!._id))
         .filter((q) => q.eq(q.field("courseId"), course._id))
         .first();

       if (!existingEnrollment) {
           // Create dummy application first
           const appId = await ctx.db.insert("enrollmentApplications", {
             studentUserId: parent._id, // Parent applied
             selectedCourseIds: [course._id],
             status: "approved",
             paymentStatus: "paid",
             notes: "Auto-enrolled via fix script",
             createdAt: now,
             updatedAt: now,
           });

           await ctx.db.insert("enrollments", {
             studentUserId: student._id,
             courseId: course._id,
             applicationId: appId,
             enrolledAt: now,
             status: "active",
           });
           enrolledCourses++;
       }
    }

    return {
      success: true,
      message: `Linked student ${student.fullName} (${student.email}) to parent ${parent.email}. Enrolled in ${enrolledCourses} new courses.`,
      studentInfo: {
        id: student._id,
        email: student.email,
        name: student.fullName
      }
    };
  }
});
