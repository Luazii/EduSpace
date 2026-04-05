import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: {
    // Correctly point to the monorepo root so Turbopack can find hoisted packages
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
};

export default nextConfig;
