// Migration script to apply the manuallyHidden field to sellers
const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function applyMigration() {
  console.log('Starting manual visibility override migration...');
  
  const prisma = new PrismaClient();
  
  try {
    // Define the SQL statements individually instead of reading from a file
    const sqlStatements = [
      `ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "manuallyHidden" BOOLEAN NOT NULL DEFAULT FALSE;`,
      `CREATE INDEX IF NOT EXISTS "idx_seller_manually_hidden" ON "Seller"("manuallyHidden");`,
      `COMMENT ON COLUMN "Seller"."manuallyHidden" IS 'Tracks if a seller has manually toggled their visibility off. When true, automatic visibility changes based on store hours will be bypassed.';`
    ];
    
    // Execute each statement separately
    for (const sql of sqlStatements) {
      console.log('Executing SQL:', sql);
      await prisma.$executeRawUnsafe(sql);
      console.log('Statement executed successfully');
    }
    
    console.log('Migration applied successfully!');
    
    // Verify the migration worked
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Seller' AND column_name = 'manuallyHidden'
    `;
    
    if (result.length > 0) {
      console.log('Verified: manuallyHidden column added to Seller table', result[0]);
    } else {
      console.log('Warning: Could not verify manuallyHidden column');
    }
    
    // Fix the PublicProducts view
    console.log('Fixing PublicProducts view...');
    
    // Drop view if exists
    try {
      await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS "PublicProducts";`);
      console.log('Dropped existing PublicProducts view');
    } catch (viewError) {
      console.log('Note: Could not drop view - it might not exist yet');
    }
    
    // Create the view
    await prisma.$executeRawUnsafe(`
      CREATE VIEW "PublicProducts" AS
      SELECT p.* 
      FROM "Product" p
      JOIN "Seller" s ON p."sellerId" = s.id
      WHERE p."isActive" = TRUE AND s."isVisible" = TRUE;
    `);
    console.log('Created PublicProducts view');
    
    // Output next steps
    console.log('\nMigration complete!');
    console.log('\nNext steps:');
    console.log('1. Run `npx prisma db pull` to update your schema');
    console.log('2. Run `npx prisma generate` to update your Prisma Client');
    console.log('3. Restart the seller service to apply changes');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration(); 