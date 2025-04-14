#!/bin/bash
set -e

# Output useful info for debugging
echo "Node version:"
node --version
echo "NPM version:"
npm --version

# Ensure proper line endings
echo "Fixing line endings for key files"
find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} \;

# Install dependencies with explicit error handling
echo "Installing dependencies..."
npm install --production --no-audit || { echo "Dependency installation failed"; exit 1; }

# Explicitly log Prisma client status
echo "Checking for pre-generated Prisma client..."
if [ -d "node_modules/.prisma" ]; then
  echo "Pre-generated Prisma client found."
else
  echo "Warning: Pre-generated Prisma client not found. Using the one generated during build."
  # NOTE: We are NOT running prisma migrate as per guidelines
fi

# Setup environment for startup
echo "Setting up environment..."
export PORT=${PORT:-8080}

# Start the application
echo "Starting application..."
npm run start 