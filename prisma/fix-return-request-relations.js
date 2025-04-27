/**
 * Fix Return Request Relations Script
 * 
 * This script demonstrates how to fix the ReturnRequest relations in the database.
 * The actual changes need to be made to the schema.prisma file, then applied with prisma db push.
 * 
 * Schema changes required:
 * 
 * 1. Add relation fields to ReturnRequest model:
 * 
 * model ReturnRequest {
 *   id            String   @id @default(cuid())
 *   orderId       String
 *   orderItemId   String
 *   userId        String
 *   reason        String?
 *   status        String   // PENDING, APPROVED, REJECTED
 *   productName   String?
 *   amount        Float?
 *   submittedAt   DateTime @default(now())
 *   user          User     @relation(fields: [userId], references: [id])
 *   order         Order    @relation(fields: [orderId], references: [id])
 *   orderItem     OrderItem @relation(fields: [orderItemId], references: [id])
 * 
 *   @@index([orderId])
 *   @@index([userId])
 *   @@index([status])
 * }
 * 
 * 2. Add the opposite relation to Order model:
 * 
 * model Order {
 *   // ... existing fields ...
 *   returnRequests ReturnRequest[]
 *   // ... existing relations ...
 * }
 * 
 * 3. Add the opposite relation to OrderItem model:
 * 
 * model OrderItem {
 *   // ... existing fields ...
 *   returnRequest ReturnRequest?
 *   // ... existing relations ...
 * }
 * 
 * 4. Confirm User model has the relation (already exists):
 * 
 * model User {
 *   // ... existing fields ...
 *   returnRequests ReturnRequest[]
 *   // ... existing relations ...
 * }
 * 
 * Instructions to apply these changes:
 * 
 * 1. Make the above changes to your schema.prisma file
 * 2. Run the following command to apply the changes:
 *    npx prisma db push
 * 3. Run this script to verify the relations:
 *    node prisma/fix-return-request-relations.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Verifying ReturnRequest relations...');
  
  try {
    // Count return requests
    const returnCount = await prisma.returnRequest.count();
    console.log(`Total return requests: ${returnCount}`);
    
    if (returnCount === 0) {
      console.log('No return requests found. Nothing to verify.');
      return;
    }
    
    // Get a single return request with its relations
    const returnRequest = await prisma.returnRequest.findFirst({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        },
        orderItem: {
          select: {
            id: true,
            productName: true,
            price: true
          }
        }
      }
    });
    
    if (!returnRequest) {
      console.log('No return request found for verification.');
      return;
    }
    
    console.log(`\nSuccessfully retrieved ReturnRequest: ${returnRequest.id}`);
    console.log(`\nRelation verification:`);
    
    // Check each relation
    if (returnRequest.user) {
      console.log(`✓ User relation: Found user ${returnRequest.user.name || returnRequest.user.id}`);
    } else {
      console.log(`✗ User relation: Failed to find related user`);
    }
    
    if (returnRequest.order) {
      console.log(`✓ Order relation: Found order ${returnRequest.order.orderNumber || returnRequest.order.id}`);
    } else {
      console.log(`✗ Order relation: Failed to find related order`);
    }
    
    if (returnRequest.orderItem) {
      console.log(`✓ OrderItem relation: Found item "${returnRequest.orderItem.productName}" (${returnRequest.orderItem.id})`);
    } else {
      console.log(`✗ OrderItem relation: Failed to find related order item`);
    }
    
    // Test bidirectional relations
    if (returnRequest.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: returnRequest.orderId },
        include: { 
          returnRequests: {
            select: { id: true }
          }
        }
      });
      
      if (order && order.returnRequests.some(r => r.id === returnRequest.id)) {
        console.log(`✓ Bidirectional Order relation: Order correctly references ReturnRequest`);
      } else {
        console.log(`✗ Bidirectional Order relation: Order does not reference ReturnRequest`);
      }
    }
    
    if (returnRequest.orderItemId) {
      const orderItem = await prisma.orderItem.findUnique({
        where: { id: returnRequest.orderItemId },
        include: { 
          returnRequest: {
            select: { id: true }
          }
        }
      });
      
      if (orderItem && orderItem.returnRequest && orderItem.returnRequest.id === returnRequest.id) {
        console.log(`✓ Bidirectional OrderItem relation: OrderItem correctly references ReturnRequest`);
      } else {
        console.log(`✗ Bidirectional OrderItem relation: OrderItem does not reference ReturnRequest`);
      }
    }
    
    // Now fetch a return with all the deep relations needed for the details page
    console.log('\nTesting full ReturnRequest details query...');
    
    const fullReturnRequest = await prisma.returnRequest.findFirst({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        order: {
          include: {
            items: true,
            address: true
          }
        },
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                sellingPrice: true
              }
            },
            seller: {
              select: {
                id: true,
                shopName: true,
                phone: true
              }
            }
          }
        }
      }
    });
    
    if (fullReturnRequest) {
      console.log(`✓ Successfully retrieved full return request details`);
      
      // Log a summary of what was retrieved
      const summary = {
        returnId: fullReturnRequest.id,
        customer: fullReturnRequest.user ? fullReturnRequest.user.name : 'N/A',
        order: fullReturnRequest.order ? fullReturnRequest.order.orderNumber : 'N/A',
        product: fullReturnRequest.orderItem ? fullReturnRequest.orderItem.productName : 'N/A',
        seller: fullReturnRequest.orderItem?.seller ? fullReturnRequest.orderItem.seller.shopName : 'N/A',
        reason: fullReturnRequest.reason || 'N/A'
      };
      
      console.log('\nReturn request summary:');
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`✗ Failed to retrieve full return request details`);
    }
    
    console.log('\nVerification complete.');
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\nDone. If you see any failed relations, make sure you:');
    console.log('1. Updated the schema.prisma file with all relation fields');
    console.log('2. Ran `npx prisma db push` to apply the changes');
    console.log('3. Verified that the data in your tables matches (orderIds, orderItemIds, etc.)');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 