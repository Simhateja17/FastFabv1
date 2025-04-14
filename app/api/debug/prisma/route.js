import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Configuration for the connection tests
const TEST_CONFIG = {
  basicTimeout: 5000,         // Basic connection test timeout in ms
  extendedTimeout: 10000,     // Extended test timeout in ms
  stressTestIterations: 5,    // Number of queries to run in stress test
  stressTestConcurrency: 3    // Number of concurrent queries in stress test
};

/**
 * Debug endpoint for Prisma connection diagnostics
 * This is only accessible in development/staging environments
 */
export async function GET(request) {
  // Only allow this in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are not available in production' },
      { status: 403 }
    );
  }
  
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('test') || 'basic';
  const results = {};
  
  try {
    console.log('Running Prisma database diagnostics');
    
    // Initialize Prisma client with diagnostic logging
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    // Basic connection test
    results.basic = await runBasicTest(prisma);
    
    // Run additional tests based on the requested test type
    if (testType === 'extended' || testType === 'full') {
      results.extended = await runExtendedTest(prisma);
    }
    
    if (testType === 'stress' || testType === 'full') {
      results.stress = await runStressTest(prisma);
    }
    
    // Always disconnect when done
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      testType,
      results
    });
    
  } catch (error) {
    console.error('Prisma diagnostic error:', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      stackTrace: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * Run a basic connection test
 */
async function runBasicTest(prisma) {
  console.log('Running basic Prisma connection test');
  const start = Date.now();
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection test timed out after ${TEST_CONFIG.basicTimeout}ms`));
      }, TEST_CONFIG.basicTimeout);
    });
    
    // Try to execute a simple query
    const queryPromise = prisma.$queryRaw`SELECT 1 as connected`;
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    const end = Date.now();
    return {
      success: true,
      connectionTime: `${end - start}ms`,
      databaseResponse: result
    };
  } catch (error) {
    const end = Date.now();
    return {
      success: false,
      connectionTime: `${end - start}ms`,
      error: error.message
    };
  }
}

/**
 * Run extended database diagnostics
 */
async function runExtendedTest(prisma) {
  console.log('Running extended Prisma connection test');
  const results = {
    connectionPool: {},
    schemaMetadata: {},
    performanceMetrics: {}
  };
  
  try {
    // Test 1: Check connection pool status
    const start1 = Date.now();
    try {
      const connectionStatus = await prisma.$queryRaw`SHOW STATUS WHERE Variable_name LIKE 'Connections' OR Variable_name LIKE '%thread%' OR Variable_name LIKE '%conn%' OR Variable_name LIKE '%timeout%'`;
      results.connectionPool = {
        success: true,
        responseTime: `${Date.now() - start1}ms`,
        status: connectionStatus
      };
    } catch (error) {
      results.connectionPool = {
        success: false,
        responseTime: `${Date.now() - start1}ms`,
        error: error.message
      };
    }
    
    // Test 2: Check database schema metadata
    const start2 = Date.now();
    try {
      // Get database schema information
      const schemaInfo = await prisma.$queryRaw`SELECT table_schema, table_name, table_rows FROM information_schema.tables WHERE table_schema = DATABASE()`;
      results.schemaMetadata = {
        success: true,
        responseTime: `${Date.now() - start2}ms`,
        tables: schemaInfo
      };
    } catch (error) {
      results.schemaMetadata = {
        success: false,
        responseTime: `${Date.now() - start2}ms`,
        error: error.message
      };
    }
    
    // Test 3: Performance metrics for a simple query
    const start3 = Date.now();
    try {
      // Execute a simple query with execution metrics
      const userCount = await prisma.user.count();
      const sellerCount = await prisma.seller.count();
      const orderCount = await prisma.order.count();
      
      results.performanceMetrics = {
        success: true,
        responseTime: `${Date.now() - start3}ms`,
        counts: {
          users: userCount,
          sellers: sellerCount,
          orders: orderCount
        }
      };
    } catch (error) {
      results.performanceMetrics = {
        success: false,
        responseTime: `${Date.now() - start3}ms`,
        error: error.message
      };
    }
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run a stress test to evaluate connection stability under load
 */
async function runStressTest(prisma) {
  console.log('Running Prisma connection stress test');
  const results = {
    iterations: [],
    summary: {}
  };
  
  try {
    const startTime = Date.now();
    
    // Create an array of concurrent query promises
    const queries = [];
    for (let i = 0; i < TEST_CONFIG.stressTestIterations; i++) {
      for (let j = 0; j < TEST_CONFIG.stressTestConcurrency; j++) {
        const queryIndex = i * TEST_CONFIG.stressTestConcurrency + j;
        
        // Mix of different query types
        let queryPromise;
        
        switch (queryIndex % 3) {
          case 0:
            // Simple count query
            queryPromise = prisma.user.count()
              .then(result => ({
                type: 'count',
                index: queryIndex,
                success: true,
                result
              }))
              .catch(error => ({
                type: 'count',
                index: queryIndex,
                success: false,
                error: error.message
              }));
            break;
          
          case 1:
            // Find many query (slightly more complex)
            queryPromise = prisma.product.findMany({
              where: { published: true },
              take: 5,
              select: { id: true, name: true }
            })
              .then(result => ({
                type: 'findMany',
                index: queryIndex,
                success: true,
                resultCount: result.length
              }))
              .catch(error => ({
                type: 'findMany',
                index: queryIndex,
                success: false,
                error: error.message
              }));
            break;
          
          case 2:
            // Raw query (most direct)
            queryPromise = prisma.$queryRaw`SELECT COUNT(*) as count FROM "Order"`
              .then(result => ({
                type: 'raw',
                index: queryIndex,
                success: true,
                result
              }))
              .catch(error => ({
                type: 'raw',
                index: queryIndex,
                success: false,
                error: error.message
              }));
            break;
        }
        
        queries.push(queryPromise);
      }
    }
    
    // Execute all queries concurrently and collect results
    const queryResults = await Promise.allSettled(queries);
    const endTime = Date.now();
    
    // Process results
    results.iterations = queryResults.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          type: 'unknown',
          success: false,
          error: result.reason.message
        };
      }
    });
    
    // Calculate summary statistics
    const totalTime = endTime - startTime;
    const successCount = results.iterations.filter(r => r.success).length;
    const failureCount = results.iterations.length - successCount;
    
    results.summary = {
      totalQueries: results.iterations.length,
      successCount,
      failureCount,
      successRate: `${((successCount / results.iterations.length) * 100).toFixed(2)}%`,
      totalTimeMs: totalTime,
      averageQueryTimeMs: (totalTime / results.iterations.length).toFixed(2)
    };
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test endpoint for writes
export async function POST(request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { sellerId } = data;
    
    if (!sellerId) {
      return NextResponse.json(
        { error: "sellerId is required" },
        { status: 400 }
      );
    }
    
    const results = {};
    
    // Test if the seller exists
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true }
      });
      
      results.sellerExists = !!seller;
    } catch (error) {
      results.sellerExists = { error: error.message };
    }
    
    // Test push subscription write
    try {
      // Create a test subscription with a unique endpoint
      const testEndpoint = `test-endpoint-${Date.now()}`;
      
      const subscription = await prisma.pushSubscription.create({
        data: {
          endpoint: testEndpoint,
          p256dh: "test-key",
          auth: "test-auth",
          sellerId: sellerId,
          updatedAt: new Date()
        }
      });
      
      // Clean up the test entry right away
      await prisma.pushSubscription.delete({
        where: { id: subscription.id }
      });
      
      results.writeTest = { success: true, id: subscription.id };
    } catch (error) {
      results.writeTest = { success: false, error: error.message, code: error.code };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 