/**
 * Migration script to add isPhoneVerified field to Seller table
 * This script adds the field without losing any existing data
 */

const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('Starting migration to add isPhoneVerified field to Seller table...');
  
  // Create a database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Connect to database
    await client.connect();
    console.log('Connected to database');

    // Check if column already exists (to make the script idempotent)
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Seller' 
      AND column_name = 'isPhoneVerified';
    `);

    // If column already exists, exit
    if (checkColumnResult.rows.length > 0) {
      console.log('Column isPhoneVerified already exists in Seller table. No changes needed.');
      return;
    }

    // Add the column to the Seller table
    console.log('Adding isPhoneVerified column to Seller table...');
    await client.query(`
      ALTER TABLE "Seller"
      ADD COLUMN "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error performing migration:', error);
    throw error;
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  }); 