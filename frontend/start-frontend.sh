#!/bin/bash

# PyTake Frontend Startup Script

echo "🚀 PyTake Frontend - Starting..."
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

# Check if backend is running
echo ""
echo "🔍 Checking backend connection..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:8080"
else
    echo "⚠️  Warning: Backend not detected at http://localhost:8080"
    echo "   Please start the backend first with: cargo run --package simple_api"
fi

echo ""
echo "🎨 Starting frontend development server..."
echo "================================"
echo ""

# Start the development server
npm run dev

# The frontend will be available at http://localhost:5173