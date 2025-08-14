#!/bin/bash

# Start PyTake Development Environment

echo "🚀 Starting PyTake Development Environment..."
echo ""

# Start Docker containers
echo "📦 Starting Docker containers (database, backend, nginx)..."
docker-compose up -d postgres redis backend nginx certbot

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Start frontend locally
echo "🎨 Starting frontend development server..."
cd pytake-frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ PyTake Development Environment Started!"
echo ""
echo "📍 Access Points:"
echo "   Frontend (local): http://localhost:3000"
echo "   Backend API: http://localhost:8080"
echo "   App (production): https://app.pytake.net"
echo "   API (production): https://api.pytake.net"
echo ""
echo "📝 To stop all services:"
echo "   docker-compose down"
echo "   kill $FRONTEND_PID"
echo ""
echo "🔄 Frontend is running in development mode (hot reload enabled)"
echo "   Any changes to frontend code will be reflected immediately"
echo ""