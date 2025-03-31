-- Add gstNumber field to Seller table
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT; 