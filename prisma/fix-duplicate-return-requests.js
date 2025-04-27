/**
 * Fix duplicate orderItemId values in ReturnRequest table
 * 
 * This script resolves duplicate orderItemId values by keeping 
 * only the most recent ReturnRequest for each orderItemId
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting duplicate ReturnRequest cleanup...');
  
  try {
    // Get all return requests
    const returnRequests = await prisma.returnRequest.findMany({
      select: {
        id: true,
        orderItemId: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: 'desc', // Most recent first
      }
    });
    
    console.log(`Total ReturnRequests: ${returnRequests.length}`);
    
    if (returnRequests.length === 0) {
      console.log('No ReturnRequests found. No cleanup needed.');
      return;
    }
    
    // Find duplicates by orderItemId
    const orderItemMap = new Map();
    const duplicates = [];
    
    for (const request of returnRequests) {
      if (orderItemMap.has(request.orderItemId)) {
        // This is a duplicate (older entry since we ordered by date desc)
        duplicates.push(request);
      } else {
        // First occurrence - save it to keep
        orderItemMap.set(request.orderItemId, request);
      }
    }
    
    if (duplicates.length === 0) {
      console.log('✓ No duplicate orderItemId values found. No cleanup needed.');
      return;
    }
    
    console.log(`Found ${duplicates.length} duplicate ReturnRequests to clean up.`);
    console.log('Will delete the following older ReturnRequests:');
    console.table(duplicates);
    
    // Confirm before proceeding
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      readline.question('Proceed with deletion? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          console.log('Proceeding with deletion...');
          
          // Delete the duplicate (older) records
          for (const duplicate of duplicates) {
            await prisma.returnRequest.delete({
              where: { id: duplicate.id }
            });
            console.log(`✓ Deleted ReturnRequest with ID: ${duplicate.id}`);
          }
          
          console.log(`Successfully deleted ${duplicates.length} duplicate ReturnRequests.`);
        } else {
          console.log('Operation cancelled.');
        }
        
        readline.close();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('Error fixing duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 