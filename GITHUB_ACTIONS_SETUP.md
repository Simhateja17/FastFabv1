# GitHub Actions Setup for Azure Deployment

This document provides instructions for setting up GitHub Actions for deploying FastFab to Azure App Service.

## Prerequisites

1. GitHub repository with your FastFab codebase
2. Azure App Service (CoutureServicesPrivateLimited)
3. Azure publish profile

## Setup Steps

### 1. Get Azure Publish Profile

1. Go to your Azure portal
2. Navigate to your "CoutureServicesPrivateLimited" Web App
3. Click on "Overview" → "Get publish profile"
4. This will download an XML file containing deployment credentials

### 2. Add Secret to GitHub

1. Go to your GitHub repository (https://github.com/couture-Services-Pvt-Ltd/FastFabv1)
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Paste the entire contents of the publish profile XML file
6. Click "Add secret"

### 3. Workflow Configuration

The workflow is already configured in `.github/workflows/azure-deploy.yml` and will:

- Run when code is pushed to the `main` branch
- Install dependencies
- Generate the Prisma client with the correct binary targets for Azure
- Build the application
- Deploy it to Azure App Service

### 4. Manual Deployment

You can also trigger the workflow manually:

1. Go to the "Actions" tab in your GitHub repository
2. Select the "Deploy to Azure" workflow
3. Click "Run workflow"

## Important Notes

- **DO NOT run `npx prisma migrate`** as per project guidelines
- The Prisma client is configured with binary targets for Azure compatibility
- Binary targets are set in both `schema.prisma` and `package.json`
- A deployment script (`deploy.sh`) is included to handle Azure-specific deployment logic

## Troubleshooting

If you experience issues with the Prisma client in production:

1. Check Azure App Service logs
2. Verify that the GitHub Actions workflow completed successfully
3. Ensure the `AZURE_WEBAPP_PUBLISH_PROFILE` secret is set correctly
4. Check that the binary targets are correctly specified in both places 