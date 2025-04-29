const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Adding grossAmount field to SellerEarning model');
  
  try {
    // Check if the column already exists
    console.log('Checking if grossAmount field already exists...');
    let columnExists = false;
    
    try {
      // Try a simple query that would fail if the column doesn't exist
      await prisma.$queryRaw`SELECT "grossAmount" FROM "SellerEarning" LIMIT 1`;
      columnExists = true;
      console.log('grossAmount field already exists in SellerEarning table.');
    } catch (error) {
      console.log('grossAmount field does not exist yet. Proceeding with migration.');
    }
    
    if (!columnExists) {
      // Execute the ALTER TABLE statement to add the grossAmount column
      console.log('Adding grossAmount column to SellerEarning table...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SellerEarning" 
        ADD COLUMN "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0
      `);
      
      console.log('Creating index for grossAmount field...');
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "idx_sellerearning_grossAmount" ON "SellerEarning"("grossAmount")
      `);
      
      console.log('Migration completed successfully: grossAmount field added to SellerEarning table');
      
      // Update existing records - calculate grossAmount from amount + commission
      console.log('Updating existing records with calculated grossAmount values...');
      await prisma.$executeRawUnsafe(`
        UPDATE "SellerEarning"
        SET "grossAmount" = "amount" + "commission"
        WHERE "grossAmount" = 0
      `);
      console.log('Existing records updated with calculated grossAmount values');
    }
    
    // Log some stats about the affected rows
    const totalEarnings = await prisma.sellerEarning.count();
    console.log(`Total SellerEarning records in database: ${totalEarnings}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Migration script failed:', e);
    process.exit(1);
  }); 