#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🔨 Starting Render build process..."
echo "Environment: $NODE_ENV"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --include=dev

# Run database setup
echo "🗄️ Setting up database..."
node src/scripts/productionSetup.js

echo "✅ Build completed successfully!"
