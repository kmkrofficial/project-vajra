import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Disable image optimization APIs that rely on Vercel's proprietary edge network
  images: { unoptimized: true },
};

export default nextConfig;
