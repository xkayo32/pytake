#!/bin/sh

# Install dependencies
npm install

# Install missing dev dependencies if needed
npm install --save-dev @types/node @types/react typescript tailwindcss postcss autoprefixer

# Build the application
npm run build

# Start the production server
npm start