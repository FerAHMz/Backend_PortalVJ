#!/bin/bash

# Docker Build Fix Script for bcrypt issues
# This script cleans up node_modules and ensures fresh native bindings

echo "🔧 Fixing bcrypt Docker build issues..."

# Remove existing node_modules and package-lock.json
echo "📁 Cleaning existing dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
echo "🗑️ Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Dependencies cleaned and reinstalled!"
echo "🐳 Now you can build your Docker container:"
echo "   docker compose up --build -d"

# Alternative: Build with no-cache
echo ""
echo "💡 If you still have issues, try building with no cache:"
echo "   docker compose build --no-cache"
echo "   docker compose up -d"
