import { mutation } from "./_generated/server";

export default mutation(async ({ db }) => {
  const user = await db.query("users").filter(q => q.eq(q.field("email"), "lgumbi2169@gmail.com")).first();
  if (user) {
    await db.patch(user._id, { role: "teacher", updatedAt: Date.now() });
  }
});
