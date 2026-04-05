import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const qualifications = await ctx.db.query("qualifications").collect();

    return await Promise.all(
      qualifications.map(async (qualification) => {
        const faculty = await ctx.db.get(qualification.facultyId);
        const courses = await ctx.db
          .query("courses")
          .withIndex("by_qualification", (q) => q.eq("qualificationId", qualification._id))
          .collect();

        return {
          ...qualification,
          faculty,
          courseCount: courses.length,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    facultyId: v.id("faculties"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("qualifications", {
      facultyId: args.facultyId,
      name: args.name,
      code: args.code,
      description: args.description,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("qualifications"),
    facultyId: v.optional(v.id("faculties")),
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
  args: { id: v.id("qualifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
