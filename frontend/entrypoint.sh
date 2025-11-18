#!/bin/sh
# Frontend entrypoint - ensures components are available

echo "🚀 PyTake Frontend Entrypoint"
echo "NODE_ENV=$NODE_ENV"

# Check if components/ui directory exists locally
if [ ! -d "/app/components/ui" ]; then
    echo "⚠️  components/ui directory not found!"
    exit 1
fi

echo "✓ Components UI directory found"
echo "✓ Installing dependencies..."
npm install

# For development
if [ "$NODE_ENV" = "development" ]; then
    echo "✓ Starting development server (npm run dev)..."
    exec npm run dev
fi

# For production
echo "✓ Building production version..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Build successful, starting server..."
    exec npm start
else
    echo "❌ Build failed!"
    exit 1
fi
