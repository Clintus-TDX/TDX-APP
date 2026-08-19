import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT use output: "standalone" on Vercel — it causes the .nft.json error
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;