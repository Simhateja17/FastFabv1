import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';




/**
 * Authenticates a request using JWT tokens from cookies or authorization header
 * @param {Request} request - Next.js route handler request object
 * @returns {Object} Authentication result with success flag and userId if successful
 */
export async function auth(request) {
  try {
    // First try to get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Using Authorization header for authentication');
      token = authHeader.substring(7);
    } else {
      // Try to get token from localStorage via custom header (client-side approach)
      const localToken = request.headers.get('X-User-Token');
      if (localToken) {
        console.log('Using X-User-Token header for authentication');
        token = localToken;
      } else {
        // Last resort - try cookies with client cookies header
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
          const cookieMatch = cookieHeader.match(/userAccessToken=([^;]+)/);
          if (cookieMatch && cookieMatch[1]) {
            console.log('Using Cookie header for authentication');
            token = cookieMatch[1];
          }
        }
      }
    }
    
    if (!token) {
      console.log('No authentication token found in request');
      return { success: false, message: 'Authentication required' };
    }
    
    // Verify token
    try {
      console.log('Verifying JWT token');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if this is a seller token (contains sellerId) or a user token (contains userId)
      if (decoded.sellerId) {
        console.log('Token verified successfully for seller:', decoded.sellerId);
        return { success: true, sellerId: decoded.sellerId };
      } else if (decoded.userId) {
        console.log('Token verified successfully for user:', decoded.userId);
        return { success: true, userId: decoded.userId };
      } else {
        console.error('Token does not contain a valid ID');
        return { success: false, message: 'Invalid token format' };
      }
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      // If we have a refresh token in the headers, try that
      const refreshHeader = request.headers.get('X-Refresh-Token') || request.headers.get('X-Seller-Refresh-Token');
      if (refreshHeader) {
        try {
          console.log('Attempting to use refresh token');
          const decodedRefresh = jwt.verify(refreshHeader, process.env.JWT_REFRESH_SECRET);
          
          // Check if this is a seller refresh token or user refresh token
          if (decodedRefresh.sellerId) {
            // Check if refresh token exists in database for seller
            const tokenRecord = await prisma.refreshToken.findFirst({
              where: { token: refreshHeader, sellerId: decodedRefresh.sellerId },
            });
            
            if (tokenRecord && new Date(tokenRecord.expiresAt) > new Date()) {
              console.log('Refresh token valid for seller:', decodedRefresh.sellerId);
              return { success: true, sellerId: decodedRefresh.sellerId, isRefreshed: true };
            }
          } else if (decodedRefresh.userId) {
            // Check if refresh token exists in database for user
            const tokenRecord = await prisma.userRefreshToken.findFirst({
              where: { token: refreshHeader, userId: decodedRefresh.userId },
            });
            
            if (tokenRecord && new Date(tokenRecord.expiresAt) > new Date()) {
              console.log('Refresh token valid for user:', decodedRefresh.userId);
              return { success: true, userId: decodedRefresh.userId, isRefreshed: true };
            }
          }
        } catch (refreshError) {
          console.error('Refresh token verification failed:', refreshError.message);
        }
      }
      
      return { success: false, message: 'Invalid or expired token' };
    }
  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, message: 'Authentication failed' };
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