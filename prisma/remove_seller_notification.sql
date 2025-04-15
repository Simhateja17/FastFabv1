-- Migration script to modify Order table for admin-focused order management
-- Author: Claude AI
-- Date: 2023-11-12

-- Retain the primarySellerId for reference but remove seller notification mechanism
-- We're keeping sellerPhone to maintain a reference to the seller contact information

-- Remove seller notification deadline field
ALTER TABLE "Order" DROP COLUMN IF EXISTS "sellerResponseDeadline";

-- Remove seller notification flag
ALTER TABLE "Order" DROP COLUMN IF EXISTS "sellerNotified";

-- Add fields for admin order management
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminProcessed" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerConfirmed" BOOLEAN DEFAULT FALSE;

-- Create index for efficiently finding unprocessed orders
CREATE INDEX IF NOT EXISTS "Order_adminProcessed_idx" ON "Order"("adminProcessed");

-- Update existing orders to have these fields
UPDATE "Order" SET "adminProcessed" = TRUE WHERE "status" NOT IN ('PENDING', 'CONFIRMED');

-- NOTE: The function and trigger for admin notification are handled directly
-- in the JavaScript migration script to avoid issues with dollar-quoted strings 