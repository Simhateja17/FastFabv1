/**
 * Apply custom migration script for WhatsApp OTP
 * This script applies the migration in a way that won't cause data loss
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

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
    
    console.log('WhatsApp OTP schema fix applied successfully');
  } catch (error) {
    console.error('Error applying WhatsApp OTP schema fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function addSellerPhoneVerifiedField() {
  try {
    console.log("Starting seller schema migration...");
    const postgres = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await postgres.connect();
    console.log("Connected to database");

    // Check if the isPhoneVerified column exists in the Seller table
    const checkColumnResult = await postgres.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Seller' AND column_name = 'isPhoneVerified';
    `);

    // If the column doesn't exist, add it
    if (checkColumnResult.rows.length === 0) {
      console.log("Adding isPhoneVerified column to Seller table...");
      await postgres.query(`
        ALTER TABLE "Seller" 
        ADD COLUMN "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log("Successfully added isPhoneVerified column to Seller table");
    } else {
      console.log("isPhoneVerified column already exists in Seller table");
    }
    
    console.log("Seller schema migration completed successfully");
    await postgres.end();
    return true;
  } catch (error) {
    console.error("Seller schema migration failed:", error);
    return false;
  }
}

// Run all migrations in sequence
async function runAllMigrations() {
  try {
    // First run the WhatsApp OTP schema fix
    await applyMigration();
    
    // Then add the isPhoneVerified field to Seller model
    const sellerMigrationResult = await addSellerPhoneVerifiedField();
    
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runAllMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 