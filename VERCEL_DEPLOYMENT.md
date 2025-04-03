# FastFab Vercel Deployment Guide

This guide covers the step-by-step process for deploying the FastFab application to Vercel for production use.

## Prerequisites

1. A Vercel account (sign up at [https://vercel.com](https://vercel.com))
2. Git repository with your FastFab codebase
3. Access to your production database credentials
4. Access to other required service credentials (Cashfree, WhatsApp Gupshup, etc.)

## Pre-Deployment Checklist

Before deploying to Vercel, complete the following checklist:

- [ ] All WhatsApp OTP functionality is tested and working locally
- [ ] 3km proximity filtering is tested and working correctly
- [ ] Seller visibility functionality is verified
- [ ] Payment gateway integration is tested with test transactions
- [ ] Run `npm run build` locally to ensure the build process completes without errors
- [ ] Ensure all environment variables are ready to be configured in Vercel

## Setting Up Vercel Project

1. **Connect Repository**:
   - Log in to Vercel and click "Add New" → "Project"
   - Select your Git provider and the FastFab repository
   - Configure project settings (name, framework preset: Next.js)

2. **Configure Environment Variables**:
   - Add all required environment variables from your `.env` file to Vercel
   - Ensure you use production values for:
     - `DATABASE_URL` (production database)
     - `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`
     - `CASHFREE_API_ENV` (set to "PRODUCTION")
     - `GUPSHUP_API_KEY` and other WhatsApp OTP credentials
     - `NEXT_PUBLIC_BASE_URL` (set to your production URL)
     - `NEXT_PUBLIC_API_URL` (set to your production API URL)
     - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

3. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Configure Project Settings**:
   - Under Project Settings → General, set Node.js Version to 18.x or higher
   - Enable "Automatically expose System Environment Variables"

## Database Migration Process

When you need to apply database migrations in production:

1. **Never use `prisma migrate` in production**. Instead, follow these steps:

2. **Create Migration SQL**:
   - Run `npx prisma db pull` locally to update your schema from the database
   - Create a new migration file in `prisma/migrations/[timestamp]_[name]/migration.sql`
   - Write the specific SQL changes needed

3. **Apply Migration**:
   - Use a direct database client like pgAdmin or psql
   - Apply the SQL migration directly to the production database
   - After applying, run `npx prisma db pull` again locally to update your schema
   - Commit and push the updated schema to your repository

4. **Update Prisma Client**:
   - Vercel will automatically generate the Prisma client during build
   - You can also trigger a manual redeployment after schema changes

## Ensuring WhatsApp OTP Works in Production

1. **Verify Gupshup Configuration**:
   - Confirm that all Gupshup environment variables are correctly set in Vercel
   - Verify that the WhatsApp template is approved for production use
   - Test sending OTPs to multiple different phone numbers

2. **Monitor WhatsApp OTP Logs**:
   - Use Vercel logs to monitor WhatsApp OTP functionality
   - Watch for any errors in the sending or verification processes

## 3km Proximity Feature in Production

1. **Verify Location Detection**:
   - Test the location detection with different browsers and devices
   - Confirm that the 3km radius limit is being strictly enforced

2. **Performance Optimization**:
   - The haversine distance calculation is optimized for production
   - Ensure database queries for nearby sellers use appropriate indexes

## Payment Gateway Configuration

1. **Cashfree Integration**:
   - Verify Cashfree credentials are correctly configured for production
   - Test multiple complete payment flows
   - Confirm that webhooks are properly configured

2. **Payment Verification**:
   - Test the payment verification process
   - Ensure orders update correctly when payment status changes

## Post-Deployment Verification

After deploying to Vercel, verify the following:

1. **Run Integration Tests**:
   - Test user registration with WhatsApp OTP
   - Test seller onboarding process
   - Verify 3km proximity filtering
   - Test payment processing
   - Verify seller visibility toggling

2. **Performance Monitoring**:
   - Monitor application performance in Vercel dashboard
   - Set up alerts for any critical issues

## Troubleshooting Common Issues

### WhatsApp OTP Issues
- Check if the Gupshup API key is valid and has sufficient balance
- Verify WhatsApp template ID and format
- Check database connectivity for storing OTPs

### Payment Gateway Issues
- Verify Cashfree API credentials
- Check webhook configuration
- Confirm environment is set to PRODUCTION

### 3km Proximity Issues
- Check browser location permissions
- Verify coordinate validation in haversine calculation
- Check database indexes on location fields

## Maintenance and Updates

1. **Applying Updates**:
   - Always test changes locally before deploying
   - Use Vercel's preview deployments for testing
   - Follow the database migration process for schema changes

2. **Rolling Back Deployments**:
   - Use Vercel's rollback feature if issues are detected
   - Have a database backup strategy in place

3. **Monitoring**:
   - Set up uptime monitoring
   - Configure error alerting
   - Regularly check application logs

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Cashfree API Documentation](https://docs.cashfree.com/docs/pg-getting-started)
- [Gupshup WhatsApp API Documentation](https://www.gupshup.io/developer/docs)

---

By following this guide, you should be able to successfully deploy the FastFab application to Vercel and ensure all critical features work correctly in production. 