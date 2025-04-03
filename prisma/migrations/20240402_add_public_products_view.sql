-- Migration script for adding PublicProducts view and related changes
-- Created: 2024-04-02

-- Create the PublicProducts view
CREATE OR REPLACE VIEW "PublicProducts" AS
SELECT p.* FROM "Product" p
JOIN "Seller" s ON p."sellerId" = s.id
WHERE p."isActive" = TRUE AND s."isVisible" = TRUE;

-- Add index to improve performance of seller visibility filtering
CREATE INDEX IF NOT EXISTS "idx_seller_visibility" ON "Seller"("isVisible");

-- Add index for product active status and seller ID for faster filtering
CREATE INDEX IF NOT EXISTS "idx_product_active_seller" ON "Product"("isActive", "sellerId");

-- Note: The relation definitions from Seller to PublicProducts and 
-- from ColorInventory to PublicProducts are handled by Prisma and don't
-- require actual database changes since PublicProducts is a view 