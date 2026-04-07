import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
