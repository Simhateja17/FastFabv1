-- Migration: Ensure products respect seller visibility
-- Create a view for public products that automatically filters by seller visibility
CREATE OR REPLACE VIEW "PublicProducts" AS
SELECT p.* FROM "Product" p
JOIN "Seller" s ON p."sellerId" = s.id
WHERE p."isActive" = TRUE AND s."isVisible" = TRUE;

-- Add index to improve performance of seller visibility filtering
CREATE INDEX IF NOT EXISTS "idx_seller_visibility" ON "Seller"("isVisible");

-- Add index for product active status and seller ID for faster filtering
CREATE INDEX IF NOT EXISTS "idx_product_active_seller" ON "Product"("isActive", "sellerId"); 