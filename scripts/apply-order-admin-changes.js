/**
 * Apply Order Admin Management Migration
 * 
 * This script applies the SQL migration for the admin-focused order management system.
 * It removes seller notification fields and adds admin-focused fields to the Order model.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Function definitions with LF line endings (not CRLF) to prevent PostgreSQL issues
const adminNotifyFunction = `CREATE OR REPLACE FUNCTION notify_admin_new_order()
RETURNS TRIGGER AS $func$
BEGIN
    -- This trigger will execute when a new order is inserted
    -- In a real implementation, you might want to call an external service here
    -- For now, we'll just update the adminNotified flag
    
    UPDATE "Order"
    SET "adminNotified" = TRUE
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;`;

const createTrigger = `DO $block$
BEGIN
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS notify_admin_new_order_trigger ON "Order";
    
    -- Create the trigger
    CREATE TRIGGER notify_admin_new_order_trigger
    AFTER INSERT ON "Order"
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_new_order();
END $block$;`;

async function applyMigration() {
  try {
    console.log('Starting Order Admin Management migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'prisma', 'remove_seller_notification.sql');
    console.log(`Reading migration from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found at: ${migrationPath}`);
      return false;
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and remove any empty ones
    const statements = migrationSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (const statement of statements) {
      // Show a preview of the statement being executed
      const preview = statement.length > 80 
        ? `${statement.substring(0, 80)}...` 
        : statement;
      console.log(`Executing: ${preview}`);
      
      try {
        await prisma.$executeRawUnsafe(`${statement};`);
      } catch (statementError) {
        console.error(`Error executing statement: ${preview}`);
        console.error(statementError);
        throw statementError;
      }
    }
    
    console.log('Basic schema changes completed successfully');
    
    // Apply the function definition separately with proper error handling
    console.log('Creating admin notification function...');
    try {
      await prisma.$executeRawUnsafe(adminNotifyFunction);
      console.log('✅ Admin notification function created successfully');
    } catch (functionError) {
      console.error('Failed to create admin notification function:');
      console.error(functionError);
      throw functionError;
    }
    
    // Apply the trigger separately with proper error handling
    console.log('Creating trigger for admin notification...');
    try {
      await prisma.$executeRawUnsafe(createTrigger);
      console.log('✅ Admin notification trigger created successfully');
    } catch (triggerError) {
      console.error('Failed to create admin notification trigger:');
      console.error(triggerError);
      throw triggerError;
    }
    
    console.log('✅ Migration completed successfully');
    
    // Verify the changes
    console.log('Verifying schema changes...');
    
    // Check if columns were added
    const adminProcessedExists = await checkColumnExists('Order', 'adminProcessed');
    const adminNotesExists = await checkColumnExists('Order', 'adminNotes');
    const sellerConfirmedExists = await checkColumnExists('Order', 'sellerConfirmed');
    
    // Check if columns were removed
    const sellerResponseDeadlineExists = await checkColumnExists('Order', 'sellerResponseDeadline');
    const sellerNotifiedExists = await checkColumnExists('Order', 'sellerNotified');
    
    // Report verification results
    console.log('\nVerification Results:');
    console.log(`adminProcessed added: ${adminProcessedExists ? '✅' : '❌'}`);
    console.log(`adminNotes added: ${adminNotesExists ? '✅' : '❌'}`);
    console.log(`sellerConfirmed added: ${sellerConfirmedExists ? '✅' : '❌'}`);
    console.log(`sellerResponseDeadline removed: ${!sellerResponseDeadlineExists ? '✅' : '❌'}`);
    console.log(`sellerNotified removed: ${!sellerNotifiedExists ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.error('Error applying migration:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function checkColumnExists(table, column) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = ${table} 
        AND column_name = ${column}
      );
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if column ${column} exists:`, error);
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  applyMigration()
    .then(success => {
      if (success) {
        console.log('\nMigration applied successfully');
        process.exit(0);
      } else {
        console.error('\nMigration failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = { applyMigration }; 