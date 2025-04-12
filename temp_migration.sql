-- Migration script to add ON DELETE CASCADE constraint for the seller-product relationship
-- First, drop the existing foreign key constraint
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey";

-- Add the new constraint with CASCADE delete
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" 
FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE;

-- Log the migration (optional)
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added ON DELETE CASCADE to Product.sellerId -> Seller.id relation';
END $$; 