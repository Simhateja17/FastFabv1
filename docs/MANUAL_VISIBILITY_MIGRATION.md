# Seller Visibility and Store Hours Migration Guide

This document explains how the seller visibility system works with automatic store hours and manual overrides.

## Overview

The visibility of a seller's products to customers is controlled by the `isVisible` flag in the database. This visibility is now determined by two factors:

1. **Store Hours** - Automatically sets visibility based on the seller's configured opening and closing times.
2. **Manual Overrides** - Allows sellers to manually override the automatic visibility by toggling the switch in the seller dashboard.

## Changes Made

1. Added a new `manuallyHidden` field to the `Seller` model to track when a seller manually overrides their visibility.
2. Updated the scheduler that checks store hours to respect manual overrides.
3. Modified the visibility toggle endpoint to set the manual override flag appropriately.

## How It Works

### Automatic Store Hours Visibility

* When a store's opening time is reached, if the seller has not manually hidden their store, it automatically becomes visible.
* When a store's closing time is reached, if the seller has not manually set their store to be visible, it automatically becomes hidden.

### Manual Visibility Override

* When a seller manually toggles visibility OFF, the `manuallyHidden` flag is set to `true` and the store immediately becomes hidden.
* When a seller manually toggles visibility ON, the `manuallyHidden` flag is cleared and the store immediately becomes visible.
* The automatic store hours scheduler will not change the visibility of stores with manual overrides.

## Implementation Details

### Database Migration

A new column has been added to the `Seller` table:

```sql
ALTER TABLE "Seller" ADD COLUMN "manuallyHidden" BOOLEAN NOT NULL DEFAULT FALSE;
```

### Scheduler Logic

The scheduler that runs every minute to check store hours now:

1. Skips sellers who have set a manual override
2. For all other sellers, updates visibility based on whether the current time is within their store hours

### API Endpoint Updates

The `PUT /api/seller/visibility` endpoint now:

1. Updates the `isVisible` flag based on the toggle value
2. Sets `manuallyHidden = true` when visibility is manually turned off
3. Sets `manuallyHidden = false` when visibility is manually turned on

## How to Apply the Migration

1. Run the migration script:
   ```
   node scripts/apply_manual_visibility_migration.js
   ```

2. Update the Prisma client:
   ```
   npx prisma generate
   ```

3. Restart the seller service to apply the changes.

## Testing

To test the new functionality:

1. Check that a seller's store becomes visible at their opening time
2. Check that a seller's store becomes hidden at their closing time
3. Verify that manually setting visibility OFF keeps the store hidden even during opening hours
4. Verify that manually setting visibility ON keeps the store visible even outside opening hours 