/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable build cache for development
  generateBuildId: async () => {
    // Generate unique build ID for each build
    return `build-${Date.now()}`
  },
  
  // Webpack config for better hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable webpack cache in development
      config.cache = false
      
      // Better source maps for debugging
      config.devtool = 'eval-source-map'
      
      // Watch options for Docker volumes
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300,
        ignored: /node_modules/,
      }
    }
    return config
  },
  
  // Disable static optimization for development
  reactStrictMode: true,
  
  // Standalone output for Docker
  output: 'standalone',
  
  
  // Image optimization
  images: {
    domains: ['localhost', 'api.pytake.net', 'app.pytake.net'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.pytake.net',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.pytake.net',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.pytake.net',
  },
  
  // Experimental features for better DX
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Headers for security and cache control
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Disable cache in development
          ...(process.env.NODE_ENV === 'development'
            ? [
                {
                  key: 'Cache-Control',
                  value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
                },
                {
                  key: 'Pragma',
                  value: 'no-cache',
                },
                {
                  key: 'Expires',
                  value: '0',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig