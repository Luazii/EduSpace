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

    // 2. Seed Departments
    const sciencesId = await ctx.db.insert("faculties", { 
      name: "Sciences Department", code: "SCI", isActive: true 
    });
    const commerceId = await ctx.db.insert("faculties", { 
      name: "Commerce Department", code: "COM", isActive: true 
    });
    const humanitiesId = await ctx.db.insert("faculties", { 
      name: "Humanities Department", code: "HUM", isActive: true 
    });

    // 3. Seed Grades & Streams
    const grade10SciId = await ctx.db.insert("qualifications", {
      facultyId: sciencesId, name: "Grade 10 Sciences", code: "G10-SCI", isActive: true
    });
    const grade11ComId = await ctx.db.insert("qualifications", {
      facultyId: commerceId, name: "Grade 11 Commerce", code: "G11-COM", isActive: true
    });
    const grade12HumId = await ctx.db.insert("qualifications", {
      facultyId: humanitiesId, name: "Grade 12 Humanities", code: "G12-HUM", isActive: true
    });

    // 4. Seed Subjects
    const courses = [
      { code: "MTH10", name: "Mathematics", dept: "Grade 10", qid: grade10SciId, price: 1200 },
      { code: "PHS10", name: "Physical Sciences", dept: "Grade 10", qid: grade10SciId, price: 1500 },
      { code: "ACC11", name: "Accounting", dept: "Grade 11", qid: grade11ComId, price: 2200 },
      { code: "ENG12", name: "English Home Language", dept: "Grade 12", qid: grade12HumId, price: 3000 },
      { code: "HST12", name: "History", dept: "Grade 12", qid: grade12HumId, price: 1100 },
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

    return { success: true, seeded: { departments: 3, grades: 3, subjects: 5 } };
  },
});
