const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function getDatabaseName() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  try {
    const matches = url.match(/\/([^/?]+)(\?|$)/);
    return matches ? matches[1] : null;
  } catch (error) {
    throw new Error('Could not extract database name from DATABASE_URL');
  }
}

async function applyDeadlockPrevention() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting deadlock prevention measures...');
    
    // Get database name from DATABASE_URL
    const dbName = getDatabaseName();
    if (!dbName) {
      throw new Error('Could not determine database name from DATABASE_URL');
    }
    console.log(`Using database: ${dbName}`);
    
    // 1. Apply the indexes one by one
    console.log('Applying indexes...');
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_deadlock_prevention_indexes.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL commands and execute them one by one
    const commands = migrationSql.split(';').filter(cmd => cmd.trim());
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await prisma.$executeRawUnsafe(cmd.trim());
          console.log('Successfully executed:', cmd.trim().slice(0, 50) + '...');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('Index already exists, continuing...');
          } else {
            throw error;
          }
        }
      }
    }
    console.log('Indexes applied successfully');
    
    // 2. Update database configuration one by one
    console.log('Updating database configuration...');
    const dbConfigCommands = [
      `ALTER DATABASE "${dbName}" SET deadlock_timeout = '5s'`,
      `ALTER DATABASE "${dbName}" SET lock_timeout = '10s'`
    ];
    
    for (const cmd of dbConfigCommands) {
      try {
        await prisma.$executeRawUnsafe(cmd);
        console.log('Successfully executed:', cmd);
      } catch (error) {
        console.warn('Warning: Could not update database configuration:', error.message);
        // Continue execution as this is not critical
      }
    }
    console.log('Database configuration completed');
    
    // 3. Verify the changes
    console.log('Verifying changes...');
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%_idx';
    `;
    
    console.log('Applied indexes:', indexes);
    
    return true;
  } catch (error) {
    console.error('Error applying deadlock prevention measures:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
applyDeadlockPrevention()
  .then(() => {
    console.log('Deadlock prevention measures applied successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to apply deadlock prevention measures:', error);
    process.exit(1);
  }); 