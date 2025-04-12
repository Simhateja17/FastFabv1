const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define the paths
const sqlMigrationPath = path.join(__dirname, 'seller-Service-2-main/seller-Service-2-main/prisma/migration_cascade_delete_seller_products.sql');
const envPath = path.join(__dirname, 'seller-Service-2-main/seller-Service-2-main/.env');

// Function to execute commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Main function
async function main() {
  try {
    // Read the .env file to get DATABASE_URL
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=["'](.+)["']/);
    
    if (!dbUrlMatch) {
      throw new Error('DATABASE_URL not found in .env file');
    }
    
    const dbUrl = dbUrlMatch[1];
    console.log('Found DATABASE_URL');
    
    // Read the SQL migration
    const sqlMigration = fs.readFileSync(sqlMigrationPath, 'utf8');
    console.log('Read SQL migration file');
    
    // Create a temporary SQL file with the migration content
    const tempSqlPath = path.join(__dirname, 'temp_migration.sql');
    fs.writeFileSync(tempSqlPath, sqlMigration);
    console.log('Created temporary SQL file');
    
    // Apply the migration using psql
    console.log('Applying SQL migration...');
    
    // Use DATABASE_URL directly
    await runCommand(`psql "${dbUrl}" -f "${tempSqlPath}"`);
    
    console.log('Migration applied successfully');
    
    // Clean up
    fs.unlinkSync(tempSqlPath);
    console.log('Cleaned up temporary files');
    
    // Update the Prisma schema
    console.log('Updating Prisma schema...');
    await runCommand('npx prisma db pull');
    
    // Generate the Prisma client
    console.log('Generating Prisma client...');
    await runCommand('npx prisma generate');
    
    console.log('DONE! Cascade relationship should now be properly set up.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 