import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: { identifier: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const match = users.find(u => 
      u.email.toLowerCase() === args.identifier.toLowerCase() || 
      u.fullName?.toLowerCase() === args.identifier.toLowerCase()
    );
    if (!match) throw new Error("User not found");
    await ctx.db.patch(match._id, { role: args.role as any, updatedAt: Date.now() });
    return match._id;
  }
});
