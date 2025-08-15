/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ultra fast development mode
  reactStrictMode: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:8080',
    NEXT_PUBLIC_WS_URL: 'ws://localhost:8080',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3003',
  },
  
  // Disable optimizations that slow down dev
  optimizeFonts: false,
  minify: false,
  
  // Minimal experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig