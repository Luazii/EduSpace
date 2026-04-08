import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Sends a Clerk invitation email to the student.
 * Requires two Convex environment variables:
 *   CLERK_SECRET_KEY — your Clerk secret key (sk_live_... / sk_test_...)
 *   APP_URL          — the production URL of the app, e.g. https://your-app.vercel.app
 */
export const sendStudentInvite = internalAction({
  args: {
    studentEmail: v.string(),
    studentFirstName: v.optional(v.string()),
    gradeLabel: v.optional(v.string()),
    applicationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    const appUrl = process.env.APP_URL ?? "https://app.eduspace.co.za";

    if (!clerkSecretKey) {
      console.warn("CLERK_SECRET_KEY not set in Convex environment — skipping invite.");
      return;
    }

    const grade = args.gradeLabel ?? "High School";
    const firstName = args.studentFirstName ?? "Learner";

    const redirectUrl = `${appUrl}/dashboard`;

    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: args.studentEmail,
        redirect_url: redirectUrl,
        public_metadata: {
          applicationId: args.applicationId,
          role: "student",
          gradeLabel: grade,
        },
        // Clerk sends a branded email by default — we attach a custom message
        // via the invitation template in the Clerk dashboard
        notify: true,
        ignore_existing: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Clerk invitation failed for ${args.studentEmail}: ${body}`);
    } else {
      console.log(`Clerk invitation sent to ${args.studentEmail} for ${grade}`);
    }
  },
});
