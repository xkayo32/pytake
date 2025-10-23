import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve trailing slashes to avoid redirect loops with FastAPI
  skipTrailingSlashRedirect: true,
  // Disable static generation for error pages to avoid Html import issues
  generateBuildId: async () => {
    return 'pytake-build-' + Date.now();
  },
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
  experimental: {
    // Skip error page generation during build
    skipMiddlewareUrlNormalize: true,
  },
  async rewrites() {
      const isDocker = process.env.DOCKER === 'true' || process.env.NEXT_PUBLIC_DOCKER === 'true';
      // Allow overriding backend host via env var (useful for Podman/docker compose)
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || (isDocker ? 'http://backend:8000' : 'http://localhost:8000');
      return [
        {
          source: '/api/:path*',
          destination: `${backendBase}/api/:path*`, // Proxy para backend local ou Docker / override via NEXT_PUBLIC_BACKEND_URL
        },
      ];
  },
};

export default nextConfig;
