-- Add shippingAddress field to Order model
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;

-- Handle existing Seller table changes (safely)
-- First, check if these columns exist before attempting to drop them
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Seller' AND column_name = 'balance') THEN
        -- Make the column nullable first to avoid data loss warnings
        ALTER TABLE "Seller" ALTER COLUMN "balance" DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Seller' AND column_name = 'payoutsEnabled') THEN
        -- Make the column nullable first to avoid data loss warnings
        ALTER TABLE "Seller" ALTER COLUMN "payoutsEnabled" DROP NOT NULL;
    END IF;
END $$; 