import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  // In production, always create a new instance
  prisma = new PrismaClient({
    log: ['warn', 'error'], // Log warnings and errors in production
  });
} else {
  // In development, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // Log more verbosely in development
    });
  }
  prisma = global.prisma;
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
