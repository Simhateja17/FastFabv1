require('dotenv').config({ path: './seller-Service-2-main/seller-Service-2-main/.env' }); // Adjust path if your .env is elsewhere
const { Client } = require('pg');

// SQL command to make the column nullable
const sqlCommand = `ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;`;

// Function to run the migration
async function runMigration() {
  // Ensure DATABASE_URL is set
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('Connecting to the database...');
    await client.connect();
    console.log('Connected successfully.');

    console.log(`Executing SQL: ${sqlCommand}`);
    await client.query(sqlCommand);
    console.log('Migration successful: "OrderItem"."productId" column is now nullable.');

  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1); // Exit with error code
  } finally {
    console.log('Closing database connection...');
    await client.end();
    console.log('Connection closed.');
  }
}

// Run the migration function
runMigration(); 