import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

/**
 * Verify admin authentication from request headers or cookies
 * @param {Request} request - The Next.js API route request object
 * @returns {Object} Auth result with success status and optional admin data
 */
export async function verifyAdminAuth(request) {
  try {
    let token = null;
    
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    
    // If no token from header, try cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('adminToken')?.value || 
              cookieStore.get('adminAccessToken')?.value ||
              cookieStore.get('token')?.value;
    }
    
    if (!token) {
      return { 
        success: false, 
        message: 'Authentication required',
        status: 401
      };
    }

    // Verify token
    try {
      // Use environment variable for JWT secret (with fallback)
      const jwtSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'your-secret-key';
      
      const decoded = jwt.verify(token, jwtSecret);
      
      // Accept different admin role formats
      const isAdmin = 
        (decoded.adminId && decoded.role === 'superadmin') || 
        (decoded.role && ['admin', 'superadmin', 'ADMIN', 'SUPER_ADMIN'].includes(decoded.role));
      
      if (!isAdmin) {
        return { 
          success: false, 
          message: 'Admin privileges required',
          status: 403
        };
      }
      
      return { 
        success: true,
        adminId: decoded.adminId || decoded.userId || decoded.id,
        role: decoded.role,
        token: token
      };
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      if (tokenError.name === 'TokenExpiredError') {
        return { 
          success: false, 
          message: 'Authentication expired',
          status: 401
        };
      }
      
      return { 
        success: false, 
        message: 'Invalid authentication',
        status: 401
      };
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    return { 
      success: false, 
      message: 'Authentication error',
      status: 500
    };
  }
} 