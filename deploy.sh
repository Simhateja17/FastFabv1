#!/bin/bash
set -e

# Add delay to avoid SCM container restart conflicts
echo "Waiting for 30 seconds to avoid SCM container restart conflicts..."
sleep 30

# --- START: NVM Setup ---
echo "Setting up NVM and Node 20..."
# Set NVM directory explicitly
export NVM_DIR="$HOME/.nvm"

# Load NVM if it exists, otherwise install it
if [ -s "$NVM_DIR/nvm.sh" ]; then
  echo "NVM found, loading..."
  \. "$NVM_DIR/nvm.sh"  # Note the space after the dot
else
  echo "NVM not found, installing..."
  # Download and run the install script
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # Source NVM again immediately after installation
  \. "$NVM_DIR/nvm.sh"
fi

# Install Node 20 and use it
echo "Installing and using Node 20..."
nvm install 20
nvm use 20
echo "Current Node version:"
node -v  # Verify v20.x.x
echo "Current NPM version:"
npm -v
# --- END: NVM Setup ---

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

# Install dependencies
echo "Installing dependencies..."
if ! npm ci; then
  echo "npm ci failed, trying npm install..."
  if ! npm install; then
    echo "npm install failed, trying with legacy peer deps..."
    npm install --legacy-peer-deps
  fi
fi

# Explicitly log Prisma client status
echo "Checking for pre-generated Prisma client..."
if [ -d "node_modules/.prisma" ]; then
  echo "Pre-generated Prisma client found."
else
  echo "Warning: Pre-generated Prisma client not found. Using the one generated during build."
fi

# Setup environment for startup
echo "Setting up environment..."
# export PORT=${PORT:-8080} # PORT is typically set by Azure automatically

# Generate Prisma Client
echo "Generating Prisma client..."
npx prisma generate

# Build the application
npm run build

# Start the application using the startup command configured in Azure
echo "Deployment script finished. Azure will start the application using the configured Startup Command."
# npm run start 