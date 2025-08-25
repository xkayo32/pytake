#!/bin/bash

echo "🧹 Clearing Next.js cache and restarting..."

# Kill any running Next.js processes
pkill -f "next dev" 2>/dev/null

# Try to remove cache (may fail due to permissions)
sudo rm -rf .next 2>/dev/null || rm -rf .next 2>/dev/null || echo "⚠️  Could not clear .next cache (permission denied)"

# Clear node_modules cache
rm -rf node_modules/.cache 2>/dev/null

# Clear any other caches
rm -rf .swc 2>/dev/null

echo "✅ Cache cleared (where possible)"
echo "🚀 Starting development server..."

# Start the development server
npm run dev