import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function run() {
  await client.mutation(anyApi.debug.forceAssignDriver, { routeId: "r57512s0p2x1gz3m6gkp68bach8c2egy" });
  console.log("Done");
}
run();
