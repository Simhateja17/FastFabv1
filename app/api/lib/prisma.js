import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

let prisma;

// Validate database connection
const validateDatabaseConnection = async (client) => {
  try {
    // Try a simple query to verify database connection
    await client.$queryRaw`SELECT 1`;
    console.log('Database connection validated successfully');
    return true;
  } catch (error) {
    console.error('Database connection validation failed:', error);
    return false;
  }
};

// Add proper error handling for client creation
const createPrismaClient = () => {
  try {
    // Check if DATABASE_URL is defined
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not found in environment variables');
      throw new Error('DATABASE_URL is not defined');
    }
    
    // Create client with retry configuration
    return new PrismaClient({
      log: ['warn', 'error'],
      // Enable connection pooling for better performance
      // These options help with connection stability
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  } catch (e) {
    console.error('Failed to create Prisma client:', e);
    // Return null or throw depending on your error handling strategy
    return null; 
  }
};

// Initialize client based on environment
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
    
    // Validate connection in development (optional)
    if (global.prisma) {
      validateDatabaseConnection(global.prisma)
        .then(isValid => {
          if (!isValid) {
            console.warn('Development database connection is not valid');
          }
        })
        .catch(err => console.error('Error validating development database:', err));
    }
  }
  prisma = global.prisma;
}

// If client creation failed, log a clear error
if (!prisma) {
  console.error('CRITICAL: Prisma client could not be initialized');
}

export default prisma; 