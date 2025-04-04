/**
 * Migration script to ensure proper setup of product views
 * Run with: node scripts/fix-product-view.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to fix product view issues...');
  
  try {
    // First check if we can directly query products
    console.log('Testing product table access...');
    const productCount = await prisma.product.count();
    console.log(`Found ${productCount} products in the database`);
    
    // Create the public products view if it doesn't exist
    console.log('Ensuring public products view exists...');
    
    // Use raw SQL to check if the view exists
    const viewCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'PublicProducts'
        AND n.nspname = 'public'
        AND c.relkind = 'v'
      );
    `;
    
    const viewExists = viewCheck[0]?.exists || false;
    
    if (!viewExists) {
      console.log('PublicProducts view does not exist, creating it...');
      
      // Create the view with a SQL statement
      await prisma.$executeRaw`
        CREATE OR REPLACE VIEW "PublicProducts" AS
        SELECT p.*
        FROM "Product" p
        JOIN "Seller" s ON p."sellerId" = s.id
        WHERE p."isActive" = true
        AND s."isVisible" = true;
      `;
      
      console.log('PublicProducts view created successfully');
    } else {
      console.log('PublicProducts view already exists, updating it...');
      
      // Update the view to ensure it has the latest definition
      await prisma.$executeRaw`
        CREATE OR REPLACE VIEW "PublicProducts" AS
        SELECT p.*
        FROM "Product" p
        JOIN "Seller" s ON p."sellerId" = s.id
        WHERE p."isActive" = true
        AND s."isVisible" = true;
      `;
      
      console.log('PublicProducts view updated successfully');
    }
    
    // Test the view
    try {
      const publicProductCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "PublicProducts"`;
      console.log(`Found ${publicProductCount[0].count} products in the PublicProducts view`);
    } catch (viewError) {
      console.error('Error testing PublicProducts view:', viewError);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Unhandled error in migration script:', e);
  process.exit(1);
}); 