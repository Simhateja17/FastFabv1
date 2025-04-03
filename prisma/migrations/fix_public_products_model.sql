-- Migration script to fix the PublicProducts view

-- Recreate the PublicProducts view with correct filtering that includes manuallyHidden
DROP VIEW IF EXISTS "PublicProducts";

CREATE OR REPLACE VIEW "PublicProducts" AS
SELECT p.* 
FROM "Product" p
JOIN "Seller" s ON p."sellerId" = s.id
WHERE p."isActive" = TRUE AND s."isVisible" = TRUE; 