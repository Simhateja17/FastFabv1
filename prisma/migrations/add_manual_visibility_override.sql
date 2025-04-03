-- Migration to add manuallyHidden field to Seller table
-- This field tracks whether a seller has manually overridden their visibility setting

-- Add the manuallyHidden column with default value of false
ALTER TABLE "Seller" ADD COLUMN "manuallyHidden" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add an index to improve performance on visibility queries
CREATE INDEX IF NOT EXISTS "idx_seller_manually_hidden" ON "Seller"("manuallyHidden");

-- Add comment to explain the purpose of the field
COMMENT ON COLUMN "Seller"."manuallyHidden" IS 'Tracks if a seller has manually toggled their visibility off. When true, automatic visibility changes based on store hours will be bypassed.'; 