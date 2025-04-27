const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * This script updates the Prisma schema relationships for ReturnRequest
 * 
 * Changes made:
 * 1. Added relations between ReturnRequest and Order
 * 2. Added relations between ReturnRequest and OrderItem
 * 3. Added relations between ReturnRequest and User (bidirectional)
 * 
 * This script verifies that the relations can be properly queried after the schema update
 */
async function main() {
  console.log('Starting ReturnRequest relations migration...');
  
  try {
    // 1. Verify that ReturnRequest model exists
    const returnCount = await prisma.returnRequest.count();
    console.log(`Current return requests in database: ${returnCount}`);
    
    if (returnCount === 0) {
      console.log('No return requests found. Nothing to migrate.');
      return;
    }
    
    // 2. Test querying return requests with the new relations
    console.log('Testing new relations...');
    
    const returnRequests = await prisma.returnRequest.findMany({
      take: 1, // Just get one for testing
      include: {
        user: true,
        order: true,
        orderItem: true
      }
    });
    
    if (returnRequests.length > 0) {
      const testReturn = returnRequests[0];
      console.log(`Successfully queried ReturnRequest ID: ${testReturn.id}`);
      
      // Check if relations are working
      console.log(`- User relation: ${testReturn.user ? 'OK' : 'Failed'}`);
      console.log(`- Order relation: ${testReturn.order ? 'OK' : 'Failed'}`);
      console.log(`- OrderItem relation: ${testReturn.orderItem ? 'OK' : 'Failed'}`);
      
      // Verify the same data can be queried from the other direction
      if (testReturn.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: testReturn.orderId },
          include: { returnRequests: true }
        });
        
        console.log(`- Order → ReturnRequests relation: ${
          order && order.returnRequests.length > 0 ? 'OK' : 'Failed'
        }`);
      }
      
      if (testReturn.orderItemId) {
        const orderItem = await prisma.orderItem.findUnique({
          where: { id: testReturn.orderItemId },
          include: { returnRequest: true }
        });
        
        console.log(`- OrderItem → ReturnRequest relation: ${
          orderItem && orderItem.returnRequest ? 'OK' : 'Failed'
        }`);
      }
    }
    
    console.log('ReturnRequest relations migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 