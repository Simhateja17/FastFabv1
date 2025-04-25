const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addShippingAddress() {
  try {
    console.log('Adding shippingAddress field to Order table...');
    
    // Execute raw SQL to add the column if it doesn't exist
    await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB`;
    
    console.log('Migration successful!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addShippingAddress(); 