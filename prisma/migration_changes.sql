generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

model Seller {
  id            String         @id @default(uuid())
  phone         String         @unique
  password      String?
  shopName      String?
  ownerName     String?
  address       String?
  city          String?
  state         String?
  pincode       String?
  openTime      String?
  closeTime     String?
  categories    String[]       @default([])
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  latitude      Float?
  longitude     Float?
  products      Product[]
  refreshTokens RefreshToken[]
  isVisible     Boolean        @default(true)
}

model SuperAdmin {
  id          String              @id @default(uuid())
  email       String              @unique
  password    String
  name        String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  adminTokens AdminRefreshToken[]
}

model AdminRefreshToken {
  id         String     @id @default(uuid())
  token      String     @unique
  adminId    String
  expiresAt  DateTime
  createdAt  DateTime   @default(now())
  superAdmin SuperAdmin @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  sellerId  String
  expiresAt DateTime
  createdAt DateTime @default(now())
  seller    Seller   @relation(fields: [sellerId], references: [id], onDelete: Cascade)
}

model Product {
  id             String           @id @default(uuid())
  name           String
  description    String?
  mrpPrice       Float
  sellingPrice   Float
  images         String[]         @default([])
  category       String?
  subcategory    String?
  sizeQuantities Json
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  sellerId       String
  seller         Seller           @relation(fields: [sellerId], references: [id])
  colorInventory ColorInventory[]
}

model ColorInventory {
  id        String   @id @default(uuid())
  productId String
  color     String
  inventory Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  colorCode String   @default("")
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, color])
}

model User {
  id                 String               @id @default(uuid())
  email              String               @unique
  phone              String?              @unique
  password           String
  name               String?
  profilePicture     String?
  isVerified         Boolean              @default(false)
  verificationToken  String?
  passwordResetToken String?
  resetTokenExpiry   DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  isPhoneVerified    Boolean              @default(false)
  lastLoginAt        DateTime?
  role               UserRole             @default(USER)
  tokenVersion       Int                  @default(0)
  addresses          Address[]
  orders             Order[]
  carts              Cart[]
  refreshTokens      UserRefreshToken[]
  payments           PaymentTransaction[]
}

model UserRefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Address {
  id        String   @id @default(uuid())
  userId    String
  name      String
  phone     String
  line1     String
  line2     String?
  city      String
  state     String
  pincode   String
  country   String   @default("India")
  isDefault Boolean  @default(false)
  latitude  Float?
  longitude Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders    Order[]
}

model Cart {
  id        String     @id @default(uuid())
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  size      String
  color     String?
  price     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
}

model Order {
  id                String               @id @default(uuid())
  orderNumber       String               @unique
  userId            String
  totalAmount       Float
  status            OrderStatus          @default(PENDING)
  paymentStatus     PaymentStatus        @default(PENDING)
  paymentMethod     PaymentMethod        @default(COD)
  addressId         String?
  discount          Float                @default(0)
  shippingFee       Float                @default(0)
  tax               Float                @default(0)
  notes             String?
  deliveryNotes     String?
  estimatedDelivery DateTime?
  trackingNumber    String?
  deliveredAt       DateTime?
  cancelledAt       DateTime?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  user              User                 @relation(fields: [userId], references: [id])
  items             OrderItem[]
  shippingAddress   Address?             @relation(fields: [addressId], references: [id])
  transactions      PaymentTransaction[]
  primarySellerId    String?
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  productId   String
  productName String
  sellerId    String
  quantity    Int
  size        String
  color       String?
  price       Float
  discount    Float    @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model PaymentTransaction {
  id                String        @id @default(uuid())
  userId            String
  orderId           String?
  amount            Float
  currency          String        @default("INR")
  status            PaymentStatus
  paymentMethod     PaymentMethod
  transactionId     String?       @unique
  gatewayResponse   Json?
  paymentLink       String?
  paymentLinkExpiry DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  user              User          @relation(fields: [userId], references: [id])
  order             Order?        @relation(fields: [orderId], references: [id])
}

model WhatsAppOTP {
  id          String   @id @default(uuid())
  phoneNumber String
  otpCode     String
  verified    Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  name        String?
  email       String?
  isNewUser   Boolean? @default(false)

  @@index([phoneNumber, expiresAt])
}

model OTP {
  id          String   @id @default(uuid())
  phoneNumber String
  otpCode     String
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  verified    Boolean  @default(false)

  @@index([phoneNumber])
}

enum ProductCategory {
  MEN
  WOMEN
  KIDS
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentStatus {
  PENDING
  SUCCESSFUL
  FAILED
  REFUNDED
}

enum PaymentMethod {
  COD
  CREDIT_CARD
  DEBIT_CARD
  UPI
  WALLET
  NET_BANKING
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

-- Migration: Add isVisible field to Seller model
-- Created: 2023-XX-XX
ALTER TABLE "Seller" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT TRUE;

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

-- Add an index on OrderItem.sellerId to improve seller order queries
CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");

-- Add a column to track primary seller for an order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "primarySellerId" TEXT;

-- Add index on primarySellerId
CREATE INDEX IF NOT EXISTS "Order_primarySellerId_idx" ON "Order"("primarySellerId");

-- Add function to automatically update Order.primarySellerId based on OrderItems
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

-- Create a trigger to update the primarySellerId when a new OrderItem is inserted
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


