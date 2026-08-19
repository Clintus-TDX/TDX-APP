import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Restore standalone output (required for Vercel Serverless + Prisma)
  output: "standalone",
  
  // 2. Explicitly configure the tracing engine to ignore the missing Bun/Prisma files
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "node_modules/@swc/core-linux-x64-gnu",
        "node_modules/@swc/core-linux-x64-musl",
      ],
    },
    turbotrace: {
      logLevel: "error",
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "space-z.ai",
    "127.0.0.1",
  ],
};

export default nextConfig;