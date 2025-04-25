-- Add missing Seller table fields that are required by the seller-service
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "balance" FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false; 