// Migration script to add ReturnRequest model
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to add ReturnRequest model...');
  
  try {
    // First check if the ReturnRequest table already exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ReturnRequest'
    `;
    
    if (tables.length > 0) {
      console.log('ReturnRequest table already exists, skipping creation');
      return;
    }

    // Create ReturnRequest table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ReturnRequest" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "orderItemId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "reason" TEXT,
        "status" TEXT NOT NULL,
        "productName" TEXT,
        "amount" DOUBLE PRECISION,
        "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
      );
      
      CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
      CREATE INDEX "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");
      CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");
    `);
    
    // Add returnWindowStatus and returnedAt fields to OrderItem if they don't exist
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'OrderItem' 
      AND column_name = 'returnWindowStatus'
    `;
    
    if (columnCheck.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "OrderItem" 
        ADD COLUMN IF NOT EXISTS "returnWindowStatus" TEXT,
        ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "returnWindowStart" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "returnWindowEnd" TIMESTAMP(3)
      `);
    }
    
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