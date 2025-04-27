/**
 * Apply Return Relations Migration
 * 
 * This script will apply the database schema changes for ReturnRequest relations
 * and verify the changes were applied correctly.
 */

const { execSync } = require('child_process');
const path = require('path');

// Function to run shell commands and print output
function runCommand(command) {
  console.log(`\nRunning command: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Command failed with error: ${error.message}`);
    console.error(error.stdout);
    console.error(error.stderr);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting Return Relations Migration Process');
  
  // Step 1: Generate Prisma client
  console.log('\n=== Step 1: Generating Prisma client ===');
  if (!runCommand('npx prisma generate')) {
    console.error('Failed to generate Prisma client. Aborting.');
    return;
  }
  
  // Step 2: Apply database changes
  console.log('\n=== Step 2: Applying database changes ===');
  console.log('Note: Using --accept-data-loss flag to allow schema modifications');
  if (!runCommand('npx prisma db push --accept-data-loss')) {
    console.error('Failed to apply database changes. Aborting.');
    return;
  }
  
  // Step 3: Run verification script
  console.log('\n=== Step 3: Verifying relation changes ===');
  try {
    // Import the verification script dynamically
    const verificationScript = path.join(__dirname, 'fix-return-request-relations.js');
    require(verificationScript);
  } catch (error) {
    console.error('Failed to run verification script:', error);
  }
  
  console.log('\n=== Migration complete ===');
  console.log('The ReturnRequest relations should now be properly configured.');
  console.log('The return details page should display all required information.');
}

// Run the main function
main().catch(error => {
  console.error('Migration failed with error:', error);
  process.exit(1);
}); 