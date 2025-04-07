import { PrismaClient } from '@prisma/client';

let prisma;

// This checks if the code is running in a production environment
if (process.env.NODE_ENV === 'production') {
  // In production, always create a new instance
  prisma = new PrismaClient();
} else {
  // In development, check if an instance already exists on the global object
  // This prevents creating multiple instances during hot-reloading
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  // Use the existing instance from the global object or the new one if it's the first time
  prisma = global.prisma;
}

// Export the single instance
export default prisma;
