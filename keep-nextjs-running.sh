#!/bin/bash
cd /home/administrator/pytake-backend/pytake-frontend-nextjs-reference

while true; do
    echo "Starting Next.js on port 3002..."
    PORT=3002 npm run dev
    echo "Next.js stopped. Restarting in 5 seconds..."
    sleep 5
done