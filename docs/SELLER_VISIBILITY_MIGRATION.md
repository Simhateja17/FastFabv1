# Seller Visibility Migration Guide

## Problem
Products from sellers with visibility set to "off" (toggle mode off) are still appearing on the website. This issue occurs because some API endpoints are directly querying the Product model rather than properly filtering based on seller visibility.

## Solution
We have implemented a database view named `PublicProducts` that automatically filters products to only include those from visible sellers and those that are marked as active. This view becomes the single source of truth for all public-facing product queries.

## Changes Made

1. **Created a Database View**: `PublicProducts` - A SQL view that automatically filters out products from sellers with visibility turned off.

```sql
CREATE OR REPLACE VIEW "PublicProducts" AS
SELECT p.*
FROM "Product" p
JOIN "Seller" s ON p."sellerId" = s."id"
WHERE p."isActive" = true AND s."isVisible" = true;
```

2. **Updated API Endpoints**: All public-facing API endpoints now use the `PublicProducts` view instead of manually filtering the `Product` model.
   - NextJS API routes (`app/api/public/*`)
   - Seller Service API routes (`seller-Service-2-main/src/routes/public.routes.js`)

3. **Added Fallback Mechanisms**: For backward compatibility, we've added fallback mechanisms in case the view hasn't been created yet.

## Implementation Steps

Follow these steps to implement the changes:

1. **Create the PublicProducts View**:
   ```bash
   # Navigate to the seller service directory
   cd seller-Service-2-main/seller-Service-2-main
   
   # Run the migration script
   node prisma/migrations/manual/create_products_view.js
   ```

2. **Update Prisma Schema** (already done, but verify):
   ```bash
   # Pull the database schema
   npx prisma db pull
   
   # Manually verify that the PublicProducts view exists in schema.prisma
   ```

3. **Deploy the Updated API Endpoints**:
   - The NextJS API routes have been updated to use PublicProducts
   - The Seller Service API routes have been updated to use PublicProducts

## Testing

To verify the fix:
1. Set a seller's visibility to "off" in the admin panel
2. Check that their products no longer appear on:
   - Homepage product listings
   - Category pages
   - Search results
   - Any other product listings

3. When a seller's visibility is set back to "on", their products should start appearing again.

## Troubleshooting

If products from hidden sellers are still visible:

1. Verify the view was created:
   ```sql
   SELECT * FROM information_schema.views 
   WHERE table_name = 'PublicProducts';
   ```

2. Test the view directly:
   ```sql
   SELECT * FROM "PublicProducts";
   ```
   
3. Check for cached data in the frontend
   - Clear browser cache
   - Verify API responses don't include products from hidden sellers

4. Verify all routes are using the view:
   - Check for any uncaught references to `prisma.product.findMany`
   - Ensure API routes have been updated to use `prisma.publicProducts.findMany`

## Legacy Code Warning

Some migration and script files may still use direct product queries, but these should not affect the user-facing experience as they're used for admin operations or one-time migrations. 