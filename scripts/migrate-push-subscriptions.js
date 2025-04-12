const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Manual Migration Script for PushSubscription Table
 *
 * This script creates the "PushSubscription" table and its indexes,
 * corresponding to the model defined in schema.prisma.
 *
 * Run this script using: node scripts/migrate-push-subscriptions.js
 */
async function main() {
  console.log('Starting migration for PushSubscription table...');

  try {
    // Attempt to enable the uuid-ossp extension if it's not already enabled
    console.log('Ensuring \'uuid-ossp\' extension is enabled...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('✅ \'uuid-ossp\' extension checked/enabled.');

    // Check if the table already exists to make the script idempotent
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' -- Adjust schema name if needed
        AND table_name = 'PushSubscription'
      );
    `;

    if (tableExists[0].exists) {
      console.log('"PushSubscription" table already exists. Skipping creation.');
    } else {
      console.log('Creating "PushSubscription" table...');
      // Create the PushSubscription table using raw SQL
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "PushSubscription" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(), -- Assuming uuid-ossp extension is enabled
          "endpoint" TEXT NOT NULL UNIQUE,
          "p256dh" TEXT NOT NULL,
          "auth" TEXT NOT NULL,
          "sellerId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "PushSubscription_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      console.log('✅ "PushSubscription" table created successfully.');

      // Create index on sellerId for faster lookups
      console.log('Creating index on "sellerId"...');
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "PushSubscription_sellerId_idx" ON "PushSubscription"("sellerId");
      `);
      console.log('✅ Index on "sellerId" created successfully.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1); // Exit with error code
  } finally {
    await prisma.$disconnect();
  }
}

main(); 