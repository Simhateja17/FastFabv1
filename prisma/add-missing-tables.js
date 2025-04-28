const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingTables() {
  try {
    console.log('Starting migration to add missing tables and enums...');

    // Step 1: Create the ReturnWindowStatus enum if it doesn't exist
    console.log('Creating ReturnWindowStatus enum...');
    try {
      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'returnwindowstatus') THEN
            CREATE TYPE "public"."ReturnWindowStatus" AS ENUM (
              'NOT_APPLICABLE',
              'ACTIVE',
              'COMPLETED',
              'RETURNED'
            );
          END IF;
        END
        $$;
      `;
      console.log('ReturnWindowStatus enum created successfully or already exists');
    } catch (error) {
      console.error('Error creating ReturnWindowStatus enum:', error.message);
    }

    // Step 2: Create the WithdrawalStatus enum if it doesn't exist
    console.log('Creating WithdrawalStatus enum...');
    try {
      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawalstatus') THEN
            CREATE TYPE "public"."WithdrawalStatus" AS ENUM (
              'PENDING',
              'PROCESSING',
              'COMPLETED',
              'FAILED',
              'CANCELLED'
            );
          END IF;
        END
        $$;
      `;
      console.log('WithdrawalStatus enum created successfully or already exists');
    } catch (error) {
      console.error('Error creating WithdrawalStatus enum:', error.message);
    }

    // Step 3: Create the EarningType enum if it doesn't exist
    console.log('Creating EarningType enum...');
    try {
      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earningtype') THEN
            CREATE TYPE "public"."EarningType" AS ENUM (
              'IMMEDIATE',
              'POST_RETURN_WINDOW'
            );
          END IF;
        END
        $$;
      `;
      console.log('EarningType enum created successfully or already exists');
    } catch (error) {
      console.error('Error creating EarningType enum:', error.message);
    }

    // Step 4: Create the Withdrawal table if it doesn't exist
    console.log('Creating Withdrawal table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "public"."Withdrawal" (
          "id" TEXT NOT NULL,
          "sellerId" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
          "gatewayTransferId" TEXT,
          "gatewayReferenceId" TEXT,
          "processedAt" TIMESTAMPTZ,
          "failedReason" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL,
          
          CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "Withdrawal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;

      // Create indexes for Withdrawal table
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_withdrawal_created_at" ON "public"."Withdrawal"("createdAt");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_withdrawal_gateway_reference_id" ON "public"."Withdrawal"("gatewayReferenceId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_withdrawal_gateway_transfer_id" ON "public"."Withdrawal"("gatewayTransferId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_withdrawal_seller_id" ON "public"."Withdrawal"("sellerId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_withdrawal_status" ON "public"."Withdrawal"("status");`;

      console.log('Withdrawal table created successfully or already exists');
    } catch (error) {
      console.error('Error creating Withdrawal table:', error.message);
    }

    // Step 5: Create the SellerEarning table if it doesn't exist
    console.log('Creating SellerEarning table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "public"."SellerEarning" (
          "id" TEXT NOT NULL,
          "sellerId" TEXT NOT NULL,
          "orderItemId" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "type" "public"."EarningType" NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "creditedToBalance" BOOLEAN NOT NULL DEFAULT false,
          "creditedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          
          CONSTRAINT "SellerEarning_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "SellerEarning_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "SellerEarning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;

      // Create indexes for SellerEarning table
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SellerEarning_sellerId_idx" ON "public"."SellerEarning"("sellerId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SellerEarning_orderItemId_idx" ON "public"."SellerEarning"("orderItemId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SellerEarning_type_idx" ON "public"."SellerEarning"("type");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SellerEarning_status_idx" ON "public"."SellerEarning"("status");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SellerEarning_creditedToBalance_idx" ON "public"."SellerEarning"("creditedToBalance");`;

      console.log('SellerEarning table created successfully or already exists');
    } catch (error) {
      console.error('Error creating SellerEarning table:', error.message);
    }

    // Step 6: Update OrderItem.returnWindowStatus to use the enum if needed
    console.log('Updating OrderItem.returnWindowStatus to use ReturnWindowStatus enum...');
    try {
      // First check if the column exists and its type
      const columnInfo = await prisma.$queryRaw`
        SELECT data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'OrderItem' AND column_name = 'returnWindowStatus';
      `;
      
      if (columnInfo.length > 0 && columnInfo[0].udt_name !== 'returnwindowstatus') {
        // Drop the existing column constraints first if needed
        await prisma.$executeRaw`
          ALTER TABLE "public"."OrderItem" 
          ALTER COLUMN "returnWindowStatus" DROP DEFAULT,
          ALTER COLUMN "returnWindowStatus" TYPE "public"."ReturnWindowStatus" USING 
            CASE 
              WHEN "returnWindowStatus" = 'NOT_APPLICABLE' THEN 'NOT_APPLICABLE'::"public"."ReturnWindowStatus"
              WHEN "returnWindowStatus" = 'ACTIVE' THEN 'ACTIVE'::"public"."ReturnWindowStatus"
              WHEN "returnWindowStatus" = 'COMPLETED' THEN 'COMPLETED'::"public"."ReturnWindowStatus"
              WHEN "returnWindowStatus" = 'RETURNED' THEN 'RETURNED'::"public"."ReturnWindowStatus"
              ELSE NULL
            END;
        `;
        console.log('OrderItem.returnWindowStatus updated to use ReturnWindowStatus enum');
      } else {
        console.log('OrderItem.returnWindowStatus already has the correct type or does not exist');
      }
    } catch (error) {
      console.error('Error updating OrderItem.returnWindowStatus:', error.message);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addMissingTables()
  .then(() => console.log('Done!'))
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  }); 