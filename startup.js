// startup.js
const { spawn } = require('child_process');

console.log('Starting Next.js application...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT || 8080}`);

// Get the port from environment variable
const port = process.env.PORT || 8080;

// Spawn Next.js start process
const nextStart = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', port], {
  stdio: 'inherit',
  env: process.env
});

// Handle process events
nextStart.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});

// Handle uncaught exceptions to prevent the app from crashing
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
}); 