import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "./convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

// npx convex run parses args directly from argv, maybe we can just use npx
