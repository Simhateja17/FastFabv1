const { PrismaClient } = require("@prisma/client");
const config = require("./config");

// ... existing code ...

// Transaction management utilities
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Executes a transaction with automatic retry on deadlocks
 * @param {Function} transactionFn - The transaction function to execute
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - The result of the transaction
 */
async function executeTransaction(transactionFn, options = {}) {
  let lastError;
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const retryDelay = options.retryDelay || RETRY_DELAY;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await transactionFn(tx);
      }, {
        timeout: options.timeout || 10000, // 10 second default timeout
        maxWait: options.maxWait || 5000, // 5 second max wait
        isolationLevel: options.isolationLevel || 'ReadCommitted'
      });
    } catch (error) {
      lastError = error;
      
      // Check if it's a deadlock or timeout error
      if (error.code === 'P2034' || // Prisma deadlock error
          error.code === 'P2028' || // Prisma timeout error
          error.message?.includes('deadlock') ||
          error.message?.includes('timeout')) {
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If it's not a deadlock/timeout or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Creates a new order with proper transaction handling
 * @param {Object} orderData - The order data
 * @returns {Promise<Order>} - The created order
 */
async function createOrderWithTransaction(orderData) {
  return executeTransaction(async (tx) => {
    // 1. Create the order
    const order = await tx.order.create({
      data: {
        ...orderData,
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING',
        paymentStatus: 'PENDING'
      }
    });

    // 2. Update product stock
    for (const item of orderData.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          sizeQuantities: {
            update: {
              [item.size]: {
                decrement: item.quantity
              }
            }
          }
        }
      });
    }

    return order;
  }, {
    maxRetries: 3,
    timeout: 15000 // 15 second timeout for order creation
  });
}

/**
 * Updates product inventory with proper transaction handling
 * @param {String} productId - The product ID
 * @param {Object} inventoryData - The inventory update data
 * @returns {Promise<Product>} - The updated product
 */
async function updateProductInventory(productId, inventoryData) {
  return executeTransaction(async (tx) => {
    return await tx.product.update({
      where: { id: productId },
      data: {
        sizeQuantities: inventoryData
      }
    });
  }, {
    maxRetries: 3,
    timeout: 5000
  });
}

// Export the utilities
module.exports = {
  prisma,
  executeTransaction,
  createOrderWithTransaction,
  updateProductInventory
}; 