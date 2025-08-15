/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimized for development speed
  reactStrictMode: false, // Disable for faster dev
  
  // Webpack config optimized for speed
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Enable webpack cache for faster builds
      config.cache = {
        type: 'memory',
      }
    }
    return config
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
  },
  
  // API Proxy configuration
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
  
  // Minimal experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig