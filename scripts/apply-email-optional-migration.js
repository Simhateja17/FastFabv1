const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get the DATABASE_URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

// Create a new pool
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Read the migration SQL file
    const migrationFilePath = path.join(__dirname, '../prisma/migrations/optional_email_field/migration.sql');
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running migration...');
    console.log(migrationSql);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(migrationSql);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration applied successfully!');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the main function
main()
  .catch(e => {
    console.error('Unhandled error:', e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  }); 