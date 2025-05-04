const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Add DEFAULT now() to PaymentTransaction.updatedAt...');

  try {
    // --- Add DEFAULT constraint to updatedAt ---
    // This makes Prisma's @updatedAt behavior consistent on creation
    // Note: Prisma Client handles the update on modification logic.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PaymentTransaction"
      ALTER COLUMN "updatedAt" SET DEFAULT now();
    `);

    console.log('Successfully added DEFAULT now() to PaymentTransaction.updatedAt.');

  } catch (error) {
    console.error('Migration failed:', error);
    // Optional: Exit with error code if needed for scripting
    process.exit(1);
  } finally {
    // Ensure Prisma client disconnects
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  }
}

// Execute the migration function
main(); 