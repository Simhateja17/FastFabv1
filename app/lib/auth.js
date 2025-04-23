import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient

// Initialize Prisma (consider moving to a lib file)
let prisma;
try {
  prisma = new PrismaClient();
} catch (e) {
  console.error("Failed to initialize Prisma Client in auth.js:", e);
  prisma = null;
}

/**
 * Authenticates a request primarily using HttpOnly cookies.
 * @param {Request} request - Next.js route handler request object
 * @returns {Promise<Object>} Authentication result with success flag and sellerId/userId if successful
 */
export async function auth(request) {
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    console.log('[AuthLib] Access token cookie not found.');
    return { success: false, message: 'Authentication required: Token missing.' };
  }

  try {
    // Verify token
    console.log('[AuthLib] Verifying token from cookie...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type and extract ID - REMOVED type CHECK
    if (decoded.sellerId) { // Check only for sellerId presence
      console.log('[AuthLib] Token verified successfully for seller:', decoded.sellerId);
      return { success: true, sellerId: decoded.sellerId };
    } else if (decoded.userId) { // Check only for userId presence
      console.log('[AuthLib] Token verified successfully for user:', decoded.userId);
      return { success: true, userId: decoded.userId };
    } else {
      console.error('[AuthLib] Token invalid: Missing sellerId or userId.', decoded);
      return { success: false, message: 'Invalid token format.' };
    }

  } catch (error) {
    console.warn('[AuthLib] Access token verification failed:', error.message);

    // --- Access Token Expired: Try using Refresh Token --- 
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      console.log('[AuthLib] Access token invalid/expired. Checking for refresh token cookie...');
      const refreshTokenValue = cookieStore.get('refreshToken')?.value;

      if (!refreshTokenValue) {
        console.log('[AuthLib] Refresh token cookie not found.');
        return { success: false, message: 'Session expired: Refresh token missing.' };
      }

      try {
        console.log('[AuthLib] Verifying refresh token...');
        const decodedRefresh = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
        console.log('[AuthLib] Refresh token decoded:', decodedRefresh);

        let isValidInDb = false;
        let id = null;
        let type = null;

        if (decodedRefresh.sellerId) { 
            type = 'seller';
            id = decodedRefresh.sellerId;
            if (!prisma) throw new Error("Database connection failed during refresh check");
            const tokenRecord = await prisma.refreshToken.findFirst({
                where: { token: refreshTokenValue, sellerId: id },
            });
            isValidInDb = tokenRecord && new Date(tokenRecord.expiresAt) > new Date();
            console.log(`[AuthLib] Seller refresh token DB check: Record found=${!!tokenRecord}, Valid=${isValidInDb}`);
        
        } else if (decodedRefresh.userId) { 
            type = 'user';
            id = decodedRefresh.userId;
            if (!prisma) throw new Error("Database connection failed during refresh check");
            const tokenRecord = await prisma.userRefreshToken.findFirst({
                where: { token: refreshTokenValue, userId: id },
            });
            isValidInDb = tokenRecord && new Date(tokenRecord.expiresAt) > new Date();
            console.log(`[AuthLib] User refresh token DB check: Record found=${!!tokenRecord}, Valid=${isValidInDb}`);
        }

        if (isValidInDb && id && type) {
          console.log(`[AuthLib] Refresh token is valid in DB for ${type}: ${id}. Need to issue new access token.`);
          // Signal that a refresh is needed - the endpoint calling auth() should handle this.
          // Ideally, this library shouldn't issue tokens itself.
          // For now, return success but indicate refresh needed or let endpoint fail?
          // Let's return failure for now, forcing a call to the /refresh endpoint.
           return { success: false, message: 'Access token expired, refresh required.', needsRefresh: true }; 
           // Or, if the calling context needs the ID despite expiry:
           // return { success: true, [type === 'seller' ? 'sellerId' : 'userId']: id, needsRefresh: true };
        } else {
             console.log('[AuthLib] Refresh token invalid or not found in DB.');
             return { success: false, message: 'Session expired: Refresh token invalid.' };
        }

      } catch (refreshError) {
        console.error('[AuthLib] Refresh token verification failed:', refreshError.message);
        return { success: false, message: 'Session expired: Refresh token verification failed.' };
      }
    } 
    // --- End Refresh Token Logic ---
    else {
      // Handle other unexpected verification errors
      console.error('[AuthLib] Unexpected token verification error:', error);
      return { success: false, message: 'Authentication error.' };
    }
  }
}

/**
 * Extract user ID from the request (for optional authentication)
 * Returns null if no valid authentication is found
 */
export async function getUserId(request) {
  const authResult = await auth(request);
  return authResult.success && authResult.userId ? authResult.userId : null;
}

/**
 * Extract seller ID from the request (for optional authentication)
 * Returns null if no valid authentication is found
 */
export async function getSellerId(request) {
  const authResult = await auth(request);
  return authResult.success && authResult.sellerId ? authResult.sellerId : null;
} 