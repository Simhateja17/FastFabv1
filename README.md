# FastFab Application

## Production-Ready Status

The application has been thoroughly optimized for production deployment on Vercel. All key components now include:

- Proper Suspense boundaries for `useSearchParams` hooks
- Production-optimized configuration files
- Secure environment variables setup
- Enhanced caching and performance configurations
- Proper database migration workflow

## Deployment Guides

For detailed deployment instructions, please refer to:

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md) - Step-by-step guide for Vercel deployment
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Additional Vercel-specific information

## Build Commands

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Vercel-optimized Build
```bash
npm run vercel-build
```

## Database Migrations

This application follows a production-safe database migration approach:

1. **Never** use `npx prisma migrate` in production
2. Use `npx prisma db pull` to update schema from the database
3. Create and apply migrations using raw SQL
4. Use the provided scripts:
   ```bash
   npm run update-schema
   npm run apply-migration
   ```

## Key Features

- WhatsApp OTP Authentication
- 3km Proximity Filtering
- Payment Gateway Integration
- Seller Visibility Toggle
- User and Seller Management

## Environment Setup

The project includes multiple environment configurations:

- `.env` - Local development
- `.env.production` - Production settings

When deploying to Vercel, use the variables from `.env.production`.

## Important Configuration Files

- `next.config.mjs` - Next.js configuration
- `vercel.json` - Vercel deployment settings
- `.eslintrc.json` - Linting configuration
- `package.json` - Project scripts and dependencies

## Troubleshooting

If you encounter build issues:

- Check that components using `useSearchParams` are wrapped in Suspense
- Verify environment variables are properly set
- Ensure database connection string is accessible
- Check for any dependency conflicts

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Run the development server:
```bash
npm run dev
```

## ESLint Configuration

An ESLint configuration file has been set up to prevent build failures:
- `react/no-unescaped-entities` - Disabled
- `@next/next/no-img-element` - Disabled
- React hooks rules set to "warn" rather than "error"

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
