# FastFab Production Deployment Guide

This document outlines the steps required to deploy the FastFab application to Vercel for production use.

## Important Pre-Deployment Checks

Before deploying to production, ensure the following:

1. Verify that all components with `useSearchParams` are wrapped in Suspense boundaries
2. Check that all environment variables are properly set
3. Ensure the database connection string is correct
4. Test the WhatsApp OTP functionality
5. Validate the Google Maps integration
6. Test the payment gateway in PRODUCTION mode

## Deployment to Vercel

### Step 1: Set up Vercel Project

1. Connect your repository to Vercel
2. Set the Framework Preset to "Next.js"
3. Set the Root Directory to the project root (where `package.json` is located)
4. Set the Build Command to: `npm run vercel-build`
5. Set the Output Directory to: `.next`

### Step 2: Configure Environment Variables

Copy the environment variables from `.env.production` to Vercel's environment variables section. Ensure the following variables are correctly set:

- `DATABASE_URL` - The production database connection string
- `NEXT_PUBLIC_API_URL` - Set to your production domain (e.g., "https://fastandfab.in")
- `NEXT_PUBLIC_BASE_URL` - Set to your production domain (e.g., "https://fastandfab.in")
- `GUPSHUP_API_KEY` and other WhatsApp OTP credentials
- `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` for payment processing
- `GOOGLE_MAPS_API_KEY` for location services
- All JWT secrets and configuration

### Step 3: Configure Production Settings

In the Vercel project settings:

1. Set the Node.js Version to 18.x or higher
2. Enable "Include source maps" for better error tracking
3. Set up a custom domain if needed
4. Configure branch deployments (typically main/master branch only)

## Database Migrations for Production

### Important: Never use `prisma migrate` directly in production

Follow this process to apply database changes:

1. **Generate SQL migration script**:
   - Use the `scripts/update_schema.js` script to pull the current schema
   - Edit the generated SQL file with your specific changes

2. **Apply the migration to production**:
   - Connect to the production database using a database client
   - Execute the SQL manually or use the provided script:
     ```
     npm run apply-migration
     ```

3. **Update Prisma client**:
   - After applying the migration, run `npx prisma generate` locally
   - Commit the updated schema.prisma

## Environment-Specific Settings

The codebase includes environment-specific configurations:

- `.env.production` - Production environment settings
- `next.config.mjs` - Production-optimized Next.js configuration
- `vercel.json` - Vercel-specific configuration

## Caching and Performance

The production deployment includes:

1. **Response headers** for optimal caching:
   - Static assets cached with `max-age=31536000, immutable`
   - API responses configured to prevent caching
   - Media files cached with `max-age=86400, stale-while-revalidate=604800`

2. **Performance optimizations**:
   - CSS and JS minification
   - Image optimization
   - Bundle analysis

## Security Measures

The production environment includes:

1. **Security headers**:
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: same-origin

2. **JWT security**:
   - Token expiration
   - Refresh token rotation

## Troubleshooting

If deployment fails:

1. Check Vercel build logs for specific errors
2. Verify that all components using `useSearchParams` are wrapped in Suspense boundaries
3. Ensure the database connection string is accessible
4. Check that all environment variables are properly set
5. Verify that the `vercel-build` script runs correctly

### Common Build Errors

- **useSearchParams error**: Ensure all components using this hook are wrapped in Suspense
- **Database connection error**: Check DATABASE_URL and network permissions
- **Module not found errors**: Verify package.json dependencies and imports
- **Memory issues**: Use NODE_OPTIONS="--max-old-space-size=4096" (already set in configuration)

## Monitoring

After deployment:

1. Set up logging with Vercel
2. Monitor Error logs
3. Check server response times
4. Verify WhatsApp OTP functionality
5. Test payment processing
6. Test user and seller registration flows

## Rollback Procedure

If issues are detected:

1. Use Vercel's rollback feature to revert to a previous deployment
2. If database changes were made, manually apply the appropriate rollback SQL

---

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Prisma Production Guide](https://www.prisma.io/docs/orm/prisma-client/deployment) 