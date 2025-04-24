const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { exec } = require('child_process');

/**
 * Migration script to update the OrderStatus enum
 * This adds ACCEPTED and REJECTED statuses while maintaining backward compatibility
 */
async function migrateOrderStatus() {
  console.log('Starting OrderStatus enum migration...');

  try {
    // Run prisma db push to update the schema
    console.log('Applying schema changes...');
    
    const prismaPush = new Promise((resolve, reject) => {
      exec('npx prisma db push', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing prisma db push: ${error.message}`);
          return reject(error);
        }
        
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });
    
    await prismaPush;
    console.log('Schema changes applied successfully');
    
    // Generate new Prisma client with updated types
    console.log('Generating updated Prisma client...');
    
    const generateClient = new Promise((resolve, reject) => {
      exec('npx prisma generate', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error generating Prisma client: ${error.message}`);
          return reject(error);
        }
        
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });
    
    await generateClient;
    console.log('Prisma client updated successfully');
    
    // Output successful migration
    console.log('OrderStatus enum migration completed successfully');
    console.log('New values ACCEPTED and REJECTED are now available for use');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateOrderStatus(); 