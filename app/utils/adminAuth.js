import jwt from 'jsonwebtoken';

/**
 * Verify admin authentication from request headers
 * @param {Request} request - The Next.js API route request object
 * @returns {Object} Auth result with success status and optional admin data
 */
export async function verifyAdminAuth(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        message: 'Authentication required',
        status: 401
      };
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    try {
      // Use environment variable for JWT secret (with fallback)
      const jwtSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'your-secret-key';
      
      const decoded = jwt.verify(token, jwtSecret);
      
      // Verify it's an admin token
      if (!decoded.adminId || decoded.role !== 'superadmin') {
        return { 
          success: false, 
          message: 'Admin privileges required',
          status: 403
        };
      }
      
      return { 
        success: true,
        adminId: decoded.adminId,
        role: decoded.role
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