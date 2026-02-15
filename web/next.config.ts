import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // This helps Next.js find the monorepo root correctly
  },
};

export default nextConfig;
