import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const faculties = await ctx.db.query("faculties").collect();
    
    return await Promise.all(
      faculties.map(async (faculty) => {
        const qualifications = await ctx.db
          .query("qualifications")
          .withIndex("by_faculty", (q) => q.eq("facultyId", faculty._id))
          .collect();
        
        const qualificationIds = qualifications.map(q => q._id);
        const courses = await ctx.db
          .query("courses")
          .collect(); // Fallback if no index exists, but ideally we'd filter
        
        // Count courses linked to these qualifications
        const linkedCoursesCount = courses.filter(c => 
          c.qualificationId && qualificationIds.includes(c.qualificationId as any)
        ).length;

        return {
          ...faculty,
          qualificationCount: qualifications.length,
          courseCount: linkedCoursesCount,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("faculties", {
      name: args.name,
      code: args.code,
      description: args.description,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("faculties"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("faculties") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seedAcademicLedger = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Clear existing (optional, but good for a clean seed)
    const existingFacs = await ctx.db.query("faculties").collect();
    for (const f of existingFacs) await ctx.db.delete(f._id);
    
    const existingQuals = await ctx.db.query("qualifications").collect();
    for (const q of existingQuals) await ctx.db.delete(q._id);
    
    const existingCourses = await ctx.db.query("courses").collect();
    for (const c of existingCourses) await ctx.db.delete(c._id);

    // 2. Seed Faculties
    const engineeringId = await ctx.db.insert("faculties", { 
      name: "Faculty of Engineering & Built Environment", code: "FEBE", isActive: true 
    });
    const scienceId = await ctx.db.insert("faculties", { 
      name: "Faculty of Science", code: "FS", isActive: true 
    });
    const managementId = await ctx.db.insert("faculties", { 
      name: "Faculty of Management & Commerce", code: "FMC", isActive: true 
    });
    const humanitiesId = await ctx.db.insert("faculties", { 
      name: "Faculty of Humanities", code: "FH", isActive: true 
    });

    // 3. Seed Qualifications
    const compSciId = await ctx.db.insert("qualifications", {
      facultyId: scienceId, name: "B.Sc Computer Science", code: "BSC01", isActive: true
    });
    const accountingId = await ctx.db.insert("qualifications", {
      facultyId: managementId, name: "Bachelor of Commerce in Accounting", code: "BCOM02", isActive: true
    });
    const civilEngId = await ctx.db.insert("qualifications", {
      facultyId: engineeringId, name: "Bachelor of Engineering (Civil)", code: "BENG03", isActive: true
    });
    const psychologyId = await ctx.db.insert("qualifications", {
      facultyId: humanitiesId, name: "Bachelor of Arts in Psychology", code: "BA04", isActive: true
    });

    // 4. Seed Courses
    const courses = [
      { code: "CSC101", name: "Programming Foundations", dept: "Science", qid: compSciId, price: 1200 },
      { code: "CSC102", name: "Data Structures & Algorithms", dept: "Science", qid: compSciId, price: 1500 },
      { code: "ACC101", name: "Financial Accounting I", dept: "Management", qid: accountingId, price: 2200 },
      { code: "STR101", name: "Structural Theory", dept: "Engineering", qid: civilEngId, price: 3000 },
      { code: "PSY101", name: "Intro to Social Psychology", dept: "Humanities", qid: psychologyId, price: 1100 },
    ];

    for (const c of courses) {
      await ctx.db.insert("courses", {
        courseCode: c.code,
        courseName: c.name,
        department: c.dept,
        qualificationId: c.qid,
        price: c.price,
        isPublished: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, seeded: { faculties: 4, quals: 4, courses: 5 } };
  },
});
