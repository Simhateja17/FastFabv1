import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Database connection configuration
const DB_CONFIG = {
  connectionTimeout: 10000,   // DB connection timeout in ms
  queryTimeout: 8000,         // Query timeout in ms
  maxRetries: 2,              // Maximum number of retry attempts for DB operations
  retryDelay: 500             // Base delay for retries in ms
};

// Create a Prisma client instance with better error handling and connection pooling
let prisma;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

const initPrisma = async () => {
  if (!prisma) {
    try {
      connectionAttempts++;
      console.log(`Prisma connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
      
      // Initialize with prisma connection pooling settings
      prisma = new PrismaClient({
        // Define query timeout
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: ['error', 'warn']
      });
      
      // Set a timeout for the connection
      const connectionPromise = prisma.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database connection timed out after ${DB_CONFIG.connectionTimeout}ms`));
        }, DB_CONFIG.connectionTimeout);
      });
      
      // Race the connection against a timeout
      await Promise.race([connectionPromise, timeoutPromise]);
      
      console.log('Prisma connected successfully for user profile');
      // Reset connection attempts on success
      connectionAttempts = 0;
    } catch (error) {
      console.error('Prisma initialization error:', error);
      
      // If we've reached max attempts, rethrow the error
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        connectionAttempts = 0; // Reset for next time
        throw new Error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts: ${error.message}`);
      }
      
      // Otherwise, release the client and retry will happen on next call
      if (prisma) {
        await prisma.$disconnect().catch(err => console.error('Error disconnecting Prisma:', err));
        prisma = null;
      }
      
      throw error;
    }
  }
  return prisma;
};

/**
 * Execute a database query with retry logic and timeout
 * @param {Function} queryFn - The query function to execute
 * @returns {Promise<any>} - The query result
 */
const executeWithRetry = async (queryFn) => {
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount <= DB_CONFIG.maxRetries) {
    try {
      // Get the database client
      const db = await initPrisma();
      
      // Create a promise that will timeout after a set duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database query timed out after ${DB_CONFIG.queryTimeout}ms`));
        }, DB_CONFIG.queryTimeout);
      });
      
      // Execute the query with a timeout
      const result = await Promise.race([queryFn(db), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Database query attempt ${retryCount + 1} failed:`, error.message);
      
      // Check if we should retry based on error type
      const shouldRetry = 
        error.code === 'P1001' || // Authentication failed
        error.code === 'P1002' || // Connection timed out 
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1017' || // Server closed the connection
        error.message.includes('timeout') || 
        error.message.includes('connection'); 
      
      if (!shouldRetry || retryCount >= DB_CONFIG.maxRetries) {
        // If we shouldn't retry or we've reached max retries, throw the error
        throw error;
      }
      
      // Wait before retrying (exponential backoff with jitter)
      const delay = Math.pow(2, retryCount) * DB_CONFIG.retryDelay;
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const finalDelay = Math.floor(delay + jitter);
      
      console.log(`Retrying DB operation in ${finalDelay}ms (retry ${retryCount + 1}/${DB_CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
      
      // Disconnect before retrying to ensure a fresh connection
      if (prisma) {
        await prisma.$disconnect().catch(err => console.error('Error disconnecting Prisma:', err));
        prisma = null;
      }
      
      retryCount++;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Database query failed after retries');
};

/**
 * Verify JWT access token
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key-for-development'
    );
    
    // Check if we have a userId field, and if not, check for sub claim which is standard JWT
    if (!decoded.userId && decoded.sub) {
      decoded.userId = decoded.sub;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Middleware to extract user ID from cookies or authorization header
 */
const extractUserIdFromToken = (request) => {
  // First try to get the token from cookies
  const cookies = request.cookies;
  const accessTokenFromCookie = cookies.get('accessToken')?.value;
  
  // If we have a token from cookies, use it
  if (accessTokenFromCookie) {
    console.log('Found access token in cookies');
    const decoded = verifyToken(accessTokenFromCookie);
    if (decoded) {
      console.log('Successfully verified token from cookies');
      return decoded.userId;
    }
  }
  
  // If no valid token in cookies, check the authorization header as fallback
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token in cookies and missing or invalid authorization header');
    return null;
  }
  
  // Extract the token from the header
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('Invalid token or token verification failed');
    return null;
  }
  
  return decoded.userId;
};

// GET handler to retrieve user profile
export async function GET(request) {
  console.log('Profile request received');
  
  try {
    // Extract user ID from token
    const userId = extractUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      }, { status: 401 });
    }
    
    console.log('Authenticated user ID:', userId);
    
    // Get user profile from database with retry logic
    try {
      const user = await executeWithRetry(db => 
        db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            // Don't include sensitive information
          }
        })
      );
      
      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
      
      // Return user profile
      return NextResponse.json({
        success: true,
        user
      }, { status: 200 });
    } catch (dbError) {
      console.error('Database error fetching user profile:', dbError);
      
      // Return a more descriptive error message
      return NextResponse.json({
        success: false,
        message: 'Error fetching user profile from database',
        error: dbError.message,
        maintainSession: true // Don't log the user out on DB errors
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Determine if this is a network/connectivity issue
    const isConnectivityIssue = 
      error.message.includes('connection') || 
      error.message.includes('network') ||
      error.message.includes('timeout');
    
    return NextResponse.json({
      success: false,
      message: 'Error fetching user profile: ' + error.message,
      maintainSession: isConnectivityIssue // Only maintain session on connectivity issues
    }, { status: 500 });
  } finally {
    // No need to disconnect here as we're reusing the connection
  }
}

// PATCH handler to update user profile
export async function PATCH(request) {
  try {
    // Extract user ID from token
    const userId = extractUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      }, { status: 401 });
    }
    
    // Get update data from request body
    const updateData = await request.json();
    
    // Update user profile with retry logic
    try {
      const updatedUser = await executeWithRetry(db => 
        db.user.update({
          where: { id: userId },
          data: {
            name: updateData.name,
            email: updateData.email,
            // Only update fields that are provided in the request
            ...(updateData.phone && { phone: updateData.phone }),
            // Don't allow updating sensitive information like password via this endpoint
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          }
        })
      );
      
      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      }, { status: 200 });
    } catch (dbError) {
      console.error('Database error updating user profile:', dbError);
      
      return NextResponse.json({
        success: false,
        message: 'Error updating user profile in database',
        error: dbError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({
      success: false,
      message: 'Error updating user profile: ' + error.message
    }, { status: 500 });
  }
} 