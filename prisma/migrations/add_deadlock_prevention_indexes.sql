-- Add indexes to prevent deadlocks and improve performance
CREATE INDEX IF NOT EXISTS "Order_userId_status_idx" ON "Order" ("userId", "status");
CREATE INDEX IF NOT EXISTS "Order_status_paymentStatus_idx" ON "Order" ("status", "paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order" ("createdAt");

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem" ("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem" ("productId");
CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_idx" ON "OrderItem" ("sellerId");

CREATE INDEX IF NOT EXISTS "Product_category_subcategory_idx" ON "Product" ("category", "subcategory");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product" ("createdAt");
CREATE INDEX IF NOT EXISTS "Product_sellerId_isActive_idx" ON "Product" ("sellerId", "isActive");

-- Add comment to explain the purpose of these indexes
COMMENT ON INDEX "Order_userId_status_idx" IS 'Improves performance of user order queries and prevents deadlocks';
COMMENT ON INDEX "Order_status_paymentStatus_idx" IS 'Improves performance of order status queries and prevents deadlocks';
COMMENT ON INDEX "Order_createdAt_idx" IS 'Improves performance of order date-based queries';
COMMENT ON INDEX "OrderItem_orderId_idx" IS 'Improves performance of order item lookups';
COMMENT ON INDEX "OrderItem_productId_idx" IS 'Improves performance of product order queries';
COMMENT ON INDEX "OrderItem_sellerId_idx" IS 'Improves performance of seller order queries';
COMMENT ON INDEX "Product_category_subcategory_idx" IS 'Improves performance of category-based queries';
COMMENT ON INDEX "Product_createdAt_idx" IS 'Improves performance of date-based product queries';
COMMENT ON INDEX "Product_sellerId_isActive_idx" IS 'Improves performance of seller product queries and prevents deadlocks'; 