import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The development toolbar overlaps the mobile bottom navigation during visual QA.
  devIndicators: false,
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default nextConfig;
