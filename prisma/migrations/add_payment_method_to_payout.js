// Migration script to add payment method fields to Payout table
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to add payment method fields to Payout table...');
  
  try {
    // Check if the paymentMethod column already exists
    const paymentMethodCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Payout' 
      AND column_name = 'paymentMethod'
    `;
    
    if (paymentMethodCheck.length > 0) {
      console.log('paymentMethod column already exists in Payout table, skipping creation');
    } else {
      // First, create the PayoutMethod enum type
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'UPI', 'WALLET', 'CARD')
      `);
      
      console.log('Created PayoutMethod enum type');
      
      // Add paymentMethod field to Payout table
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Payout" 
        ADD COLUMN "paymentMethod" "PayoutMethod" NOT NULL DEFAULT 'BANK_TRANSFER'
      `);
      
      console.log('Added paymentMethod column to Payout table');
    }
    
    // Check if the paymentDetails column already exists
    const paymentDetailsCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Payout' 
      AND column_name = 'paymentDetails'
    `;
    
    if (paymentDetailsCheck.length > 0) {
      console.log('paymentDetails column already exists in Payout table, skipping creation');
    } else {
      // Add paymentDetails JSON field to Payout table
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Payout" 
        ADD COLUMN "paymentDetails" JSONB
      `);
      
      console.log('Added paymentDetails column to Payout table');
    }

    // Check if the remarks column already exists
    const remarksCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Payout' 
      AND column_name = 'remarks'
    `;
    
    if (remarksCheck.length > 0) {
      console.log('remarks column already exists in Payout table, skipping creation');
    } else {
      // Add remarks field to Payout table
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Payout" 
        ADD COLUMN "remarks" TEXT
      `);
      
      console.log('Added remarks column to Payout table');
    }
    
    // Create index on paymentMethod
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Payout_paymentMethod_idx" ON "Payout"("paymentMethod")
    `);
    
    // For existing records, populate paymentDetails with bank info from seller
    // This ensures backward compatibility
    await prisma.$executeRawUnsafe(`
      UPDATE "Payout" p
      SET "paymentDetails" = jsonb_build_object(
        'accountHolderName', s."bankAccountName",
        'bankName', s."bankName",
        'accountNumber', s."accountNumber",
        'ifscCode', s."ifsc"
      )
      FROM "Seller" s
      WHERE p."sellerId" = s.id
        AND p."paymentDetails" IS NULL
        AND s."accountNumber" IS NOT NULL
        AND s."ifsc" IS NOT NULL
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 