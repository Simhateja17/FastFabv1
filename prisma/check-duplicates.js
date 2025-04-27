/**
 * Check for duplicate orderItemId values in ReturnRequest table
 * 
 * Run this script before the migration to identify potential issues
 * with adding the @unique constraint to orderItemId
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for duplicate orderItemId values in ReturnRequest table...');
  
  try {
    // Get all return requests
    const returnRequests = await prisma.returnRequest.findMany({
      select: {
        id: true,
        orderItemId: true,
      }
    });
    
    console.log(`Total ReturnRequests: ${returnRequests.length}`);
    
    if (returnRequests.length === 0) {
      console.log('No ReturnRequests found. No duplication check needed.');
      return;
    }
    
    // Check for duplicates
    const orderItemIds = returnRequests.map(r => r.orderItemId);
    const uniqueOrderItemIds = new Set(orderItemIds);
    
    if (orderItemIds.length === uniqueOrderItemIds.size) {
      console.log('✓ No duplicate orderItemId values found. Safe to add @unique constraint.');
    } else {
      console.log(`⚠️ WARNING: Found ${orderItemIds.length - uniqueOrderItemIds.size} duplicate orderItemId values!`);
      
      // Find the duplicates
      const counts = {};
      orderItemIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      
      const duplicates = Object.entries(counts)
        .filter(([id, count]) => count > 1)
        .map(([id, count]) => ({ orderItemId: id, count }));
      
      console.log('Duplicate orderItemIds:');
      console.table(duplicates);
      
      // Show the actual return requests with duplicate orderItemIds
      for (const { orderItemId } of duplicates) {
        const dupes = returnRequests.filter(r => r.orderItemId === orderItemId);
        console.log(`\nReturnRequests with orderItemId = ${orderItemId}:`);
        console.table(dupes);
      }
      
      console.log('\nYou must resolve these duplicates before adding the @unique constraint.');
      console.log('Options:');
      console.log('1. Keep only the most recent ReturnRequest for each orderItemId');
      console.log('2. Create new unique orderItem records for the duplicates');
      console.log('3. Modify the schema to not require @unique on orderItemId (less ideal)');
    }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
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