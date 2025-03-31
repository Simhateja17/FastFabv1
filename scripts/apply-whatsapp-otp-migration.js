// Script to apply WhatsAppOTP table migration
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Starting migration for WhatsAppOTP table...');

  // Create a new PrismaClient instance
  const prisma = new PrismaClient();

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'prisma/migrations/add_whatsapp_otp_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into separate statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each SQL statement
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      await prisma.$executeRawUnsafe(`${statement};`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 