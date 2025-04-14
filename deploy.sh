#!/bin/bash

# Output useful info for debugging
echo "Node version:"
node --version
echo "NPM version:"
npm --version

# Install dependencies 
npm install --production

# Use pre-generated Prisma client
echo "Using pre-generated Prisma client"

# Note: We're NOT running prisma migrate as per guidelines
# Instead, the Prisma client should be generated during CI/CD

# Start the application
npm run start 