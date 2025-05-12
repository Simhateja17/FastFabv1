const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting manual migration to add promo code tables...');

    // Create PromoCode table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PromoCode" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
        "discountValue" DOUBLE PRECISION NOT NULL,
        "minOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "maxDiscountAmount" DOUBLE PRECISION,
        "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "usageLimit" INTEGER,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "userUsageLimit" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PromoCode_code_key" UNIQUE ("code")
      );
    `;

    // Create indexes for PromoCode
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCode_code_idx" ON "PromoCode"("code");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCode_isActive_idx" ON "PromoCode"("isActive");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCode_startDate_endDate_idx" ON "PromoCode"("startDate", "endDate");`;

    // Create PromoCodeUsage table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PromoCodeUsage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "promoCode" TEXT NOT NULL,
        "orderId" TEXT,
        "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "discountAmount" DOUBLE PRECISION NOT NULL,

        CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PromoCodeUsage_userId_promoCode_orderId_key" UNIQUE ("userId", "promoCode", "orderId")
      );
    `;

    // Create indexes for PromoCodeUsage
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCodeUsage_userId_idx" ON "PromoCodeUsage"("userId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCodeUsage_promoCode_idx" ON "PromoCodeUsage"("promoCode");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PromoCodeUsage_orderId_idx" ON "PromoCodeUsage"("orderId");`;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Migration script executed successfully');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Migration script failed:', e);
    process.exit(1);
  }); 