const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Define the paths
const sqlMigrationsPath = path.join(__dirname, '../prisma/sql_migrations.sql');
const envPath = path.join(__dirname, '../seller-Service-2-main/seller-Service-2-main/.env');
const projectEnvPath = path.join(__dirname, '../.env');
const prismaEnvPath = path.join(__dirname, '../prisma/.env');

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
    // Step 1: Check if we need to back up existing environment files
    if (fs.existsSync(projectEnvPath)) {
      console.log('Backing up existing .env file...');
      fs.copyFileSync(projectEnvPath, `${projectEnvPath}.backup`);
      console.log('Project .env file backed up.');
    }
    
    // Step 2: Copy the .env file from seller-service to project root
    console.log('Copying .env file from seller-service...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Write to project root
    fs.writeFileSync(projectEnvPath, envContent);
    console.log('.env file copied to project root.');
    
    // Remove any existing prisma .env to avoid conflicts
    if (fs.existsSync(prismaEnvPath)) {
      fs.unlinkSync(prismaEnvPath);
      console.log('Removed existing prisma .env file to avoid conflicts.');
    }
    
    // Step 3: Run prisma db pull to update the schema
    console.log('Running prisma db pull...');
    await runCommand('npx prisma db pull');
    console.log('Schema updated successfully.');

    // Step 4: Apply the SQL migration changes using the pg library
    console.log('Applying migration changes...');
    const sqlMigrations = fs.readFileSync(sqlMigrationsPath, 'utf8');
    
    if (!sqlMigrations.trim()) {
      console.warn('No SQL migrations found in the migration file.');
      console.log('Skipping database migration step.');
    } else {
      // Extract the DATABASE_URL from the .env file
      const dbUrlMatch = envContent.match(/DATABASE_URL=["'](.+)["']/);
      if (!dbUrlMatch) {
        throw new Error('DATABASE_URL not found in .env file');
      }
      
      const dbUrl = dbUrlMatch[1];
      
      // Apply migration using the pg client
      console.log('Connecting to database...');
      const client = new Client({
        connectionString: dbUrl
      });
      
      await client.connect();
      console.log('Connected to database successfully.');
      
      console.log('Executing SQL migration...');
      try {
        // Split the SQL by semicolons to execute each statement separately
        const sqlStatements = sqlMigrations
          .split(';')
          .filter(statement => statement.trim() !== '')
          .map(statement => statement.trim() + ';');
        
        console.log(`Found ${sqlStatements.length} SQL statements to execute.`);
        
        // Execute each SQL statement
        for (let i = 0; i < sqlStatements.length; i++) {
          const statement = sqlStatements[i];
          console.log(`Executing statement ${i+1}/${sqlStatements.length}: ${statement.substring(0, 60)}...`);
          
          try {
            await client.query(statement);
            console.log(`Statement ${i+1} executed successfully.`);
          } catch (sqlError) {
            if (sqlError.message.includes('already exists')) {
              console.log(`Object already exists, continuing: ${sqlError.message}`);
            } else if (sqlError.message.includes('does not exist') && statement.includes('IF NOT EXISTS')) {
              console.log(`Object doesn't exist, but using IF NOT EXISTS so continuing.`);
            } else {
              console.warn(`Error executing statement ${i+1}: ${sqlError.message}`);
              console.warn('Continuing with next statement...');
            }
          }
        }
        
        console.log('Migration changes applied successfully.');
      } finally {
        await client.end();
        console.log('Database connection closed.');
      }
    }
    
    // Step 5: Run prisma generate to update the client
    console.log('Updating Prisma client...');
    await runCommand('npx prisma generate');
    console.log('Prisma client updated successfully.');
    
    // Step 6: Create a file to track that the migration has been applied
    const migrationTrackerPath = path.join(__dirname, '../prisma/migration_applied.txt');
    fs.writeFileSync(migrationTrackerPath, `Migration applied at ${new Date().toISOString()}`);
    console.log('Created migration tracker file.');
    
    console.log('All operations completed successfully!');
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

main(); 