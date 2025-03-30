import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Add fetch timeouts
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
