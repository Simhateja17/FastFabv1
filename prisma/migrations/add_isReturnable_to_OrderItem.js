// Migration script to add isReturnable field to OrderItem
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to add isReturnable field to OrderItem model...');
  
  try {
    // Check if the isReturnable column already exists in OrderItem table
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'OrderItem' 
      AND column_name = 'isReturnable'
    `;
    
    if (columnCheck.length > 0) {
      console.log('isReturnable column already exists in OrderItem table, skipping creation');
    } else {
      // Add isReturnable field to OrderItem table only if it doesn't exist
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "OrderItem" 
        ADD COLUMN "isReturnable" BOOLEAN NOT NULL DEFAULT false
      `);
    }
    
    // Now update all existing OrderItems based on their related Product's isReturnable status
    console.log('Updating existing OrderItems from their related Products...');
    
    // This query joins OrderItem with Product and updates OrderItem.isReturnable based on Product.isReturnable
    await prisma.$executeRawUnsafe(`
      UPDATE "OrderItem" oi
      SET "isReturnable" = p."isReturnable"
      FROM "Product" p
      WHERE oi."productId" = p."id"
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