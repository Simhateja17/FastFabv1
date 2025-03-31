-- Add latitude and longitude columns to the seller table
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION; 