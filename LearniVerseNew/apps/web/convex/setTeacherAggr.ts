import { mutation } from "./_generated/server";

export default mutation(async ({ db }) => {
  await db.patch("jx7b0aq5tppgs79dpaese0r5d983xrmm", { role: "teacher", updatedAt: Date.now() });
});
