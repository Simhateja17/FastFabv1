import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
};

// Define the global type without TypeScript syntax
const globalForPrisma = global;
globalForPrisma.prisma = globalForPrisma.prisma || undefined;

// Singleton pattern to prevent multiple instances
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Error handling and monitoring middleware
prisma.$use(async (params, next) => {
  const before = Date.now();
  try {
    const result = await next(params);
    const after = Date.now();
    // Log slow queries (over 1 second)
    if (after - before > 1000) {
      console.warn(`Slow query detected (${after - before}ms):`, {
        model: params.model,
        action: params.action,
        args: params.args
      });
    }
    return result;
  } catch (error) {
    console.error('Database operation failed:', {
      model: params.model,
      action: params.action,
      args: params.args,
      error
    });
    throw error;
  }
});

// Ensure connections are properly closed when the app shuts down
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
