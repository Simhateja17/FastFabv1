const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running migration to add seller balance fields...');
    
    // Execute each SQL command separately
    console.log('Adding balance column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "balance" FLOAT NOT NULL DEFAULT 0`);
    
    console.log('Adding payoutsEnabled column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false`);
    
    console.log('Migration successful!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration(); 