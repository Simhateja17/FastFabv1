// Script to apply WhatsApp OTP migrations
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Starting WhatsApp OTP migration...');
    
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '../prisma/migrations/add_whatsapp_otp_fields.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent.split(';').filter(statement => statement.trim() !== '');
    
    // Execute each SQL statement
    console.log('Applying SQL migrations...');
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(`${statement};`);
        console.log('Executed statement:', statement);
      }
    }
    
    console.log('SQL migrations applied successfully.');
    
    // Generate Prisma client with the updated schema
    console.log('Generating updated Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('WhatsApp OTP migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration(); 