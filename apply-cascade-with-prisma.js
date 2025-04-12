const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Function to execute commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function main() {
  console.log('Starting direct database migration...');
  
  // Initialize PrismaClient
  const prisma = new PrismaClient();
  
  try {
    // Execute raw SQL to drop existing constraint
    console.log('Dropping existing foreign key constraint...');
    await prisma.$executeRaw`ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey"`;
    
    // Add new constraint with CASCADE delete
    console.log('Adding ON DELETE CASCADE constraint...');
    await prisma.$executeRaw`ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" 
    FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE`;
    
    console.log('SQL migration executed successfully');
    
    // Update Prisma schema with db pull
    console.log('Updating Prisma schema...');
    await runCommand('npx prisma db pull');
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    await runCommand('npx prisma generate');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 