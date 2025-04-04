-- Add default value to updatedAt in Seller table
ALTER TABLE "Seller" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP; 