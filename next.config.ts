import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js walks up
  // to the nearest ancestor lockfile — an unrelated package-lock.json in the
  // user's home directory — and treats the entire home dir as the workspace,
  // which makes the dev file watcher pick up unrelated file churn elsewhere
  // on disk and can starve/loop Fast Refresh.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
