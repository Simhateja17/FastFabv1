-- Drop cart-related tables
DROP TABLE IF EXISTS "CartItem";
DROP TABLE IF EXISTS "Cart";

-- Remove cart relations from User model if they exist
ALTER TABLE "User" DROP COLUMN IF EXISTS "cartId"; 