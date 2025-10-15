import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve trailing slashes to avoid redirect loops with FastAPI
  skipTrailingSlashRedirect: true,
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
  async rewrites() {
      const isDocker = process.env.DOCKER === 'true' || process.env.NEXT_PUBLIC_DOCKER === 'true';
      return [
        {
          source: '/api/:path*',
          destination: isDocker
            ? 'http://backend:8000/api/:path*'
            : 'http://localhost:8000/api/:path*', // Proxy para backend local ou Docker
        },
      ];
  },
};

export default nextConfig;
