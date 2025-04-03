-- Migration to ensure seller visibility fields are present
-- This maintains the ability to control shop visibility in the marketplace
-- Runs compatible with all PostgreSQL versions and safely handles when columns already exist

-- Add isVisible column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Seller' AND column_name = 'isVisible'
    ) THEN
        ALTER TABLE "Seller" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT TRUE;
        RAISE NOTICE 'Added isVisible column to Seller table';
    ELSE
        RAISE NOTICE 'isVisible column already exists in Seller table';
    END IF;
END $$;

-- Add manuallyHidden column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Seller' AND column_name = 'manuallyHidden'
    ) THEN
        ALTER TABLE "Seller" ADD COLUMN "manuallyHidden" BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added manuallyHidden column to Seller table';
    ELSE
        RAISE NOTICE 'manuallyHidden column already exists in Seller table';
    END IF;
END $$;

-- Create index on isVisible if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'Seller' AND indexname = 'idx_seller_visibility'
    ) THEN
        CREATE INDEX "idx_seller_visibility" ON "Seller" ("isVisible");
        RAISE NOTICE 'Created index idx_seller_visibility on Seller table';
    ELSE
        RAISE NOTICE 'Index idx_seller_visibility already exists in Seller table';
    END IF;
END $$;

-- Create index on manuallyHidden if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'Seller' AND indexname = 'idx_seller_manually_hidden'
    ) THEN
        CREATE INDEX "idx_seller_manually_hidden" ON "Seller" ("manuallyHidden");
        RAISE NOTICE 'Created index idx_seller_manually_hidden on Seller table';
    ELSE
        RAISE NOTICE 'Index idx_seller_manually_hidden already exists in Seller table';
    END IF;
END $$; 