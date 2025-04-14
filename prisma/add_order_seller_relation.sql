-- Migration script to add Order-Seller relation
-- This script establishes a direct relationship between Orders and Sellers
-- Author: Claude AI
-- Date: 2023-11-09

-- Add primarySellerId column to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "primarySellerId" TEXT;

-- Add an index on this column for faster seller order lookups
CREATE INDEX IF NOT EXISTS "Order_primarySellerId_idx" ON "Order"("primarySellerId");

-- Add an index on OrderItem.sellerId to improve seller order queries
CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");

-- Create function to automatically maintain Order.primarySellerId based on its OrderItems
CREATE OR REPLACE FUNCTION update_order_primary_seller()
RETURNS TRIGGER AS $$
DECLARE
    primary_seller_id TEXT;
BEGIN
    -- Find the most common sellerId among the order items
    SELECT sellerId INTO primary_seller_id
    FROM "OrderItem"
    WHERE orderId = NEW.orderId AND sellerId IS NOT NULL
    GROUP BY sellerId
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Update the order's primarySellerId if we found one
    IF primary_seller_id IS NOT NULL THEN
        UPDATE "Order"
        SET "primarySellerId" = primary_seller_id
        WHERE id = NEW.orderId;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the primarySellerId when a new OrderItem is inserted or updated
DO $$
BEGIN
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS update_order_primary_seller_trigger ON "OrderItem";
    
    -- Create the trigger
    CREATE TRIGGER update_order_primary_seller_trigger
    AFTER INSERT OR UPDATE OF sellerId ON "OrderItem"
    FOR EACH ROW
    EXECUTE FUNCTION update_order_primary_seller();
END $$;

-- Populate the primarySellerId for existing orders
DO $$
DECLARE 
    order_record RECORD;
    primary_seller_id TEXT;
BEGIN
    -- Loop through all orders without primarySellerId
    FOR order_record IN SELECT id FROM "Order" WHERE "primarySellerId" IS NULL LOOP
        -- Find the most common sellerId for this order
        SELECT sellerId INTO primary_seller_id
        FROM "OrderItem"
        WHERE orderId = order_record.id AND sellerId IS NOT NULL
        GROUP BY sellerId
        ORDER BY COUNT(*) DESC
        LIMIT 1;
        
        -- Update the order if we found a primary seller
        IF primary_seller_id IS NOT NULL THEN
            UPDATE "Order"
            SET "primarySellerId" = primary_seller_id
            WHERE id = order_record.id;
        END IF;
    END LOOP;
END $$;

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN "Order"."primarySellerId" IS 'Primary seller ID for this order (most common seller among order items)';

-- Log migration completion
DO $$
BEGIN 
    RAISE NOTICE 'Order-Seller relation migration completed successfully';
END $$; 