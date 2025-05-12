const { spawn } = require('child_process');
const path = require('path');

// Path to the migration script
const migrationScriptPath = path.join(__dirname, 'prisma', 'migrations', 'manual', 'add-promo-codes.js');

console.log(`Running migration script: ${migrationScriptPath}`);

// Run the migration script
const child = spawn('node', [migrationScriptPath], {
  stdio: 'inherit', // This will show the output in the console
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('Migration completed successfully');
  } else {
    console.error(`Migration failed with code ${code}`);
    process.exit(code);
  }
}); 