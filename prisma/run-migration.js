/**
 * Master Migration Script for ReturnRequest Relations
 * 
 * This script runs all steps of the migration process:
 * 1. Checks for duplicate orderItemId values
 * 2. Fixes duplicates if needed
 * 3. Updates the Prisma client
 * 4. Applies database schema changes
 * 5. Verifies the relations
 */

const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

// Function to run shell commands and print output
function runCommand(command) {
  console.log(`\nRunning command: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Command failed with error: ${error.message}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

// Function to create a readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Function to ask a yes/no question
async function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main function
async function main() {
  console.log('======================================================');
  console.log('RETURN REQUEST RELATIONS MIGRATION');
  console.log('======================================================');

  const rl = createReadlineInterface();
  
  try {
    // Step 1: Check for duplicates
    console.log('\n=== STEP 1: Checking for duplicate orderItemId values ===');
    if (!runCommand('node prisma/check-duplicates.js')) {
      const continueDespiteDuplicates = await askQuestion(
        rl, 
        '\nDuplicates may have been found. Do you want to run the fix-duplicates script? (y/n): '
      );
      
      if (continueDespiteDuplicates) {
        // Step 2: Fix duplicates
        console.log('\n=== STEP 2: Fixing duplicate orderItemId values ===');
        if (!runCommand('node prisma/fix-duplicate-return-requests.js')) {
          const continueAfterFailedFix = await askQuestion(
            rl,
            '\nFix may not have completed successfully. Continue anyway? (y/n): '
          );
          
          if (!continueAfterFailedFix) {
            console.log('Migration aborted.');
            rl.close();
            return;
          }
        }
      } else {
        console.log('Migration aborted.');
        rl.close();
        return;
      }
    }
    
    // Step 3: Generate Prisma client
    console.log('\n=== STEP 3: Generating Prisma client ===');
    if (!runCommand('npx prisma generate')) {
      const continueAfterFailedGenerate = await askQuestion(
        rl,
        '\nPrisma client generation failed. Continue anyway? (y/n): '
      );
      
      if (!continueAfterFailedGenerate) {
        console.log('Migration aborted.');
        rl.close();
        return;
      }
    }
    
    // Step 4: Apply database changes
    console.log('\n=== STEP 4: Applying database schema changes ===');
    console.log('\nWarning: This step will use --accept-data-loss which may cause data loss.');
    const confirmDataLoss = await askQuestion(
      rl,
      'Are you sure you want to continue? (y/n): '
    );
    
    if (!confirmDataLoss) {
      console.log('Migration aborted.');
      rl.close();
      return;
    }
    
    if (!runCommand('npx prisma db push --accept-data-loss')) {
      const continueAfterFailedPush = await askQuestion(
        rl,
        '\nDatabase schema changes failed. Continue to verification anyway? (y/n): '
      );
      
      if (!continueAfterFailedPush) {
        console.log('Migration aborted.');
        rl.close();
        return;
      }
    }
    
    // Step 5: Verify relations
    console.log('\n=== STEP 5: Verifying relations ===');
    runCommand('node prisma/fix-return-request-relations.js');
    
    console.log('\n======================================================');
    console.log('MIGRATION COMPLETE');
    console.log('======================================================');
    console.log('The ReturnRequest relations should now be properly configured.');
    console.log('The return details page should display all required information.');
    
  } catch (error) {
    console.error('Migration failed with error:', error);
  } finally {
    rl.close();
  }
}

// Run the main function
main(); 