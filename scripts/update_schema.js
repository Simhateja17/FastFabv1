// Schema update script that follows production-safe practices
// This script:
// 1. Pulls the current schema from the database
// 2. Identifies changes needed
// 3. Creates a SQL migration file for those specific changes
// 4. Never uses prisma migrate directly

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting production-safe schema update process...');
    
    // Step 1: Backup the current schema file
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    const backupPath = path.join(__dirname, '../prisma/schema.prisma.backup');
    
    console.log('Creating schema backup...');
    fs.copyFileSync(schemaPath, backupPath);
    console.log('Schema backup created at', backupPath);
    
    // Step 2: Pull the current schema from the database
    console.log('Pulling current schema from database using prisma db pull...');
    execSync('npx prisma db pull', { stdio: 'inherit' });
    console.log('Schema pulled successfully');
    
    // Step 3: Generate a timestamp for the migration files
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const migrationName = `${timestamp}_schema_update`;
    
    // Step 4: Create a directory for this migration
    const migrationsDir = path.join(__dirname, '../prisma/migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const migrationDir = path.join(migrationsDir, migrationName);
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir);
    }
    
    // Step 5: Create an empty migration SQL file
    const sqlFilePath = path.join(migrationDir, 'migration.sql');
    fs.writeFileSync(sqlFilePath, '-- SQL migration file for schema changes\n-- Add your specific SQL changes here\n');
    console.log('Created migration file at', sqlFilePath);
    
    // Step 6: Create a README.md with instructions
    const readmePath = path.join(migrationDir, 'README.md');
    const readmeContent = `# Schema Update Migration

## Overview
This migration was generated on ${new Date().toISOString()} using the production-safe schema update process.

## Implementation Steps
1. The latest schema was pulled from the database using \`prisma db pull\`
2. A migration SQL file was created for manual editing

## Manual Steps Required
1. Edit the migration.sql file to include specific SQL changes needed
2. Run the SQL directly against your database using your preferred method
3. After applying the SQL changes, run \`npx prisma db pull\` again to keep the schema in sync

## Important Notes
- This migration follows the recommended practice of separating schema changes from data migrations
- Never use \`prisma migrate\` in production as it can lead to data loss
- Always back up your database before applying migrations
`;
    fs.writeFileSync(readmePath, readmeContent);
    
    // Step 7: Generate the Prisma client
    console.log('Generating Prisma client with updated schema...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Step 8: Record the migration in a tracking file
    const migrationRecord = {
      name: migrationName,
      timestamp: new Date().toISOString(),
      method: 'db-pull',
      appliedChanges: [],
    };
    
    const recordsPath = path.join(__dirname, '../prisma/migration_records.json');
    let records = [];
    
    if (fs.existsSync(recordsPath)) {
      records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    }
    
    records.push(migrationRecord);
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
    console.log('Migration record saved.');
    console.log(`
    ========== NEXT STEPS ==========
    1. Edit the SQL migration file at: ${sqlFilePath}
    2. Add your specific schema changes as SQL statements
    3. Run the SQL directly on your production database
    4. Run 'npx prisma db pull' again to sync the schema
    ================================
    `);
    
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 