-- Add gstNumber field to Seller table
-- This column has already been added manually to the database
-- This migration file is for documentation purposes only
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT; 