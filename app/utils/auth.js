import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extracts and verifies user token from request
 * @param {Request} request - The Next.js API route request object
 * @returns {Object|null} User object if authenticated, null otherwise
 */
export async function getUserFromToken(request) {
  try {
    // First try to get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // If no Authorization header, try cookies
      const cookieStore = await cookies();
      token = cookieStore.get('accessToken')?.value;
    }
    
    if (!token) {
      return null;
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if it's a user token
    if (!decoded.userId) {
      return null;
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Extracts and verifies admin token from request
 * @param {Request} request - The Next.js API route request object
 * @returns {Object|null} Admin object if authenticated, null otherwise
 */
export async function getAdminFromToken(request) {
  try {
    // First try to get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // If no Authorization header, try cookies - properly awaited
      // Check for all possible admin token cookie names
      const cookieStore = await cookies();
      token = cookieStore.get('adminToken')?.value || 
              cookieStore.get('adminAccessToken')?.value ||
              cookieStore.get('token')?.value;
    }
    
    if (!token) {
      return null;
    }
    
    // Verify token
    const jwtSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Accept either adminId with role superadmin or just role admin
    if (!(decoded.adminId || (decoded.role && ['admin', 'superadmin', 'SUPER_ADMIN'].includes(decoded.role)))) {
      return null;
    }
    
    // If we have an adminId, get admin from database
    if (decoded.adminId) {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      
      return admin;
    }
    
    // If no adminId but valid role, return a simplified admin object
    return {
      id: decoded.userId || decoded.id || 'system-admin',
      name: decoded.name || 'Admin',
      email: decoded.email || 'admin@example.com',
      role: decoded.role
    };
    
  } catch (error) {
    console.error('Admin auth error:', error);
    return null;
  }
} 