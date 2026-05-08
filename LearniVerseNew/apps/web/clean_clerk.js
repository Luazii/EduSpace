import { Clerk } from "@clerk/backend";
import dotenv from "dotenv";

dotenv.config({ path: "apps/web/.env.local" });

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function run() {
  console.log("Fetching Clerk users...");
  try {
    const { data: users } = await clerk.users.getUserList();
    
    for (const u of users) {
      const emails = u.emailAddresses.map(e => e.emailAddress.toLowerCase());
      const names = [u.firstName, u.lastName].map(n => (n || "").toLowerCase());
      
      const matchEmail = emails.some(e => e.includes("gumbi") || e.includes("lwazi"));
      const matchName = names.some(n => n.includes("gumbi") || n.includes("lwazi"));
      
      if (matchEmail || matchName) {
        console.log(`Deleting clerk user ${u.id} (${emails.join(", ")})`);
        await clerk.users.deleteUser(u.id);
      }
    }
    console.log("Clerk cleanup done.");
  } catch (err) {
    console.error("Clerk error:", err);
  }
}

run();
