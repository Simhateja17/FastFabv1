// Apply custom SQL migration script
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // Create a new PrismaClient instance
  const prisma = new PrismaClient();

  try {
    console.log('Connecting to database...');
    
    // Read the SQL migration files
    const sellerSqlPath = path.join(__dirname, '../prisma/migrations/manual/add_default_to_seller_updatedat.sql');
    const userSqlPath = path.join(__dirname, '../prisma/migrations/manual/add_default_to_user_id.sql');
    
    const sellerSqlContent = fs.readFileSync(sellerSqlPath, 'utf8');
    const userSqlContent = fs.readFileSync(userSqlPath, 'utf8');

    // Apply seller migration
    console.log('Applying migration: add_default_to_seller_updatedat.sql');
    console.log(sellerSqlContent);
    await prisma.$executeRawUnsafe(sellerSqlContent);
    console.log('Seller migration applied successfully!');
    
    // Apply user migration
    console.log('Applying migration: add_default_to_user_id.sql');
    console.log(userSqlContent);
    await prisma.$executeRawUnsafe(userSqlContent);
    console.log('User migration applied successfully!');
    
    return true;
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    // Disconnect the Prisma client
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  }); 