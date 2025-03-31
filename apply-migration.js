/**
 * Apply custom migration script for WhatsApp OTP
 * This script applies the migration in a way that won't cause data loss
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying migration: fix_whatsapp_otp_schema');
    
    // Apply the function creation statement
    console.log('Creating update_modified_column function');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $BODY$ 
      BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
      END;
      $BODY$ LANGUAGE plpgsql;
    `);
    
    // Apply the trigger drop statement
    console.log('Dropping existing trigger if it exists');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS set_whatsapp_otp_timestamp ON "WhatsAppOTP";
    `);
    
    // Apply the trigger creation statement
    console.log('Creating the trigger');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER set_whatsapp_otp_timestamp
      BEFORE UPDATE ON "WhatsAppOTP"
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `);
    
    console.log('Migration applied successfully');
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 