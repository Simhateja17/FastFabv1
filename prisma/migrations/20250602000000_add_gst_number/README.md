# Migration: Add GST Number field to Seller Model

This migration adds a new `gstNumber` field to the Seller model to support GST validation during seller onboarding.

## Changes:
- Added `gstNumber` TEXT field to the Seller table
- Updated API validation to require and validate GST number format
- Fixed Next.js dynamic route parameter handling
- Added proper field filtering for updates

## Safety:
This migration is safe because:
1. It only adds a new column without affecting existing data
2. It doesn't impact Google Maps functionality
3. It enhances the seller onboarding process
4. It doesn't affect WhatsApp OTP authentication
5. It's backward compatible with existing seller records

## Application:
This migration should be applied directly to the database first, then the schema should be updated using:
```
npx prisma db pull
``` 