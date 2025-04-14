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

# Check Node.js version and warn if below required
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
NODE_MINOR=$(echo $NODE_VERSION | cut -d '.' -f 2)

echo "Detected Node.js $NODE_VERSION"
if [ "$NODE_MAJOR" -lt 18 ] || ([ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -lt 18 ]); then
  echo "WARNING: Your Node.js version ($NODE_VERSION) is below the required version (18.18.0)"
  echo "Attempting to work around version checks..."
  
  # Try to bypass Prisma version check (use with caution!)
  export PRISMA_SKIP_ENGINE_VERSION_CHECK=1
  export PRISMA_CLIENT_ENGINE_TYPE=binary
  # Continue anyway, as we're using pre-generated Prisma client
else
  echo "Node.js version is compatible with requirements"
fi

# Install dependencies with --force flag
echo "Installing dependencies..."
npm install --production --no-audit --force || { 
  echo "Dependency installation with --force flag failed"
  echo "Trying with legacy peer deps..."
  npm install --production --no-audit --legacy-peer-deps || {
    echo "All installation attempts failed"
    # Continue anyway to use pre-built assets
    echo "Continuing with deployment using pre-built assets"
  }
}

# Explicitly log Prisma client status
echo "Checking for pre-generated Prisma client..."
if [ -d "node_modules/.prisma" ]; then
  echo "Pre-generated Prisma client found."
else
  echo "Warning: Pre-generated Prisma client not found. Using the one generated during build."
fi

# Setup environment for startup
echo "Setting up environment..."
export PORT=${PORT:-8080}

# Start the application
echo "Starting application with next start command"
npm run start 