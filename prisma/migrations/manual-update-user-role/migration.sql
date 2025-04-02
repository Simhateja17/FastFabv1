-- Add the SELLER role to the UserRole enum
-- This script is designed to be safe - it checks if the value exists first
-- to avoid errors during re-runs

DO $$
BEGIN
    -- Check if the SELLER value exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'SELLER' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'userrole'
        )
    ) THEN
        -- Add SELLER to the UserRole enum if it doesn't exist
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SELLER';
    END IF;
END
$$; 