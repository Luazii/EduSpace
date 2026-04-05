import { mutation } from "./_generated/server";

export default mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "lgumbi2169@gmail.com"))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      role: "teacher",
      updatedAt: Date.now(),
    });

    return user._id;
  },
});
