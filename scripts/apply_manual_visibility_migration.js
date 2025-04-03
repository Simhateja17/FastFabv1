// Script to apply the seller visibility migration in a production-safe way
// This script:
// 1. Connects directly to the database using pg
// 2. Applies the migration SQL with error handling
// 3. Records the migration application

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Migration file path
const migrationFilePath = path.join(__dirname, '../prisma/migrations/seller_visibility/migration.sql');

// Main function
async function main() {
  console.log('Starting seller visibility migration application...');
  
  // Verify migration file exists
  if (!fs.existsSync(migrationFilePath)) {
    console.error('Migration file not found:', migrationFilePath);
    process.exit(1);
  }
  
  // Read migration SQL
  const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');
  console.log('Read migration SQL file successfully');
  
  // Get database connection string
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  // Connect to the database
  const client = new Client({
    connectionString: databaseUrl,
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database successfully');
    
    // Apply migration
    console.log('Applying seller visibility migration...');
    await client.query(migrationSQL);
    console.log('Migration applied successfully');
    
    // Record migration application
    const timestamp = new Date().toISOString();
    const migrationRecord = {
      name: 'seller_visibility',
      applied_at: timestamp,
      script: migrationFilePath
    };
    
    // Create migration records directory if needed
    const recordsDir = path.join(__dirname, '../prisma/migration_records');
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }
    
    // Write migration record
    const recordPath = path.join(recordsDir, 'seller_visibility.json');
    fs.writeFileSync(recordPath, JSON.stringify(migrationRecord, null, 2));
    console.log('Migration record created at:', recordPath);
    
    console.log('Seller visibility migration complete!');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    // Always close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the main function
main(); 