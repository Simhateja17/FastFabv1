/**
 * Order Notifications Migration Script
 * 
 * This script adds the necessary fields to support order notifications:
 * - Adds template IDs to environment variables
 * - Ensures the schema supports Gupshup template notifications
 * 
 * IMPORTANT: This is a manual migration file - do NOT use prisma migrate
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the new environment variables to add
const newEnvVars = {
  // Template IDs for Gupshup templates
  GUPSHUP_TEMPLATE_CUSTOMER_ORDER_CANCELLED: 'customer_order_cancelled_refund',
  GUPSHUP_TEMPLATE_ADMIN_ORDER_PENDING: 'admin_order_pending_seller',
  GUPSHUP_TEMPLATE_SELLER_NEW_ORDER: 'seller_order_with_image',
  
  // Admin phone number for notifications
  ADMIN_NOTIFICATION_PHONE: '916301658275', // Using the provided number
};

// Function to update the .env file with new variables
async function updateEnvFile() {
  try {
    console.log('Updating .env file with notification template IDs...');
    
    // Path to .env file
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Read the current .env file
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.error('Error reading .env file:', error);
      return false;
    }
    
    // Add new environment variables if they don't exist
    Object.entries(newEnvVars).forEach(([key, value]) => {
      if (!envContent.includes(`${key}=`)) {
        envContent += `\n${key}=${value}`;
      }
    });
    
    // Add a comment before the new variables if they were all added
    if (!envContent.includes('# Order notification templates')) {
      envContent += '\n\n# Order notification templates';
      Object.entries(newEnvVars).forEach(([key, value]) => {
        envContent += `\n${key}=${value}`;
      });
    }
    
    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ .env file updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating .env file:', error);
    return false;
  }
}

// Function to update Order model if needed
async function updateOrderModel() {
  try {
    console.log('Checking Order model for notification fields...');
    
    // Check if seller notifications are required and query database
    const hasSellerPhoneField = await checkTableHasColumn('Order', 'sellerPhone');
    const hasAdminNotifiedField = await checkTableHasColumn('Order', 'adminNotified');
    const hasSellerNotifiedField = await checkTableHasColumn('Order', 'sellerNotified');
    const hasCustomerNotifiedField = await checkTableHasColumn('Order', 'customerNotified');
    
    // If all required fields exist, we don't need to do anything
    if (hasSellerPhoneField && hasAdminNotifiedField && hasSellerNotifiedField && hasCustomerNotifiedField) {
      console.log('✅ Order model already has all required notification fields');
      return true;
    }
    
    // Otherwise, we need to add the missing fields
    console.log('Adding missing notification fields to Order model...');
    
    // Add sellerPhone field if it doesn't exist
    if (!hasSellerPhoneField) {
      await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerPhone" TEXT`;
      console.log('✅ Added sellerPhone field to Order model');
    }
    
    // Add adminNotified field if it doesn't exist
    if (!hasAdminNotifiedField) {
      await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNotified" BOOLEAN DEFAULT FALSE`;
      console.log('✅ Added adminNotified field to Order model');
    }
    
    // Add sellerNotified field if it doesn't exist
    if (!hasSellerNotifiedField) {
      await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerNotified" BOOLEAN DEFAULT FALSE`;
      console.log('✅ Added sellerNotified field to Order model');
    }
    
    // Add customerNotified field if it doesn't exist
    if (!hasCustomerNotifiedField) {
      await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerNotified" BOOLEAN DEFAULT FALSE`;
      console.log('✅ Added customerNotified field to Order model');
    }
    
    // Add seller response deadline field
    await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerResponseDeadline" TIMESTAMP WITH TIME ZONE`;
    console.log('✅ Added sellerResponseDeadline field to Order model');
    
    return true;
  } catch (error) {
    console.error('Error updating Order model:', error);
    return false;
  }
}

// Helper function to check if a table has a specific column
async function checkTableHasColumn(tableName, columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = ${tableName.toLowerCase()}
        AND column_name = ${columnName.toLowerCase()}
      );
    `;
    
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if ${tableName} has ${columnName}:`, error);
    return false;
  }
}

// Main migration function
async function migrateOrderNotifications() {
  console.log('Starting order notifications migration...');
  
  try {
    // Run all migration tasks
    const envResult = await updateEnvFile();
    const orderModelResult = await updateOrderModel();
    
    // Check if all tasks were successful
    if (envResult && orderModelResult) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.error('❌ Migration completed with errors!');
    }
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the migration
migrateOrderNotifications(); 