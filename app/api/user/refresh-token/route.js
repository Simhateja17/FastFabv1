import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'; // Import cookies

// Create a Prisma client instance
let prisma;

const initPrisma = async () => {
  if (!prisma) {
    try {
      prisma = new PrismaClient();
      await prisma.$connect();
      console.log('Prisma connected successfully for token refresh');
    } catch (error) {
      console.error('Prisma initialization error:', error);
      throw error;
    }
  }
  return prisma;
};

/**
 * Verify JWT refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development'
    );
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
};

/**
 * Generate new access token (only access token needed here)
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: '15m' } // Standard expiry for access token
  );
};

export async function POST(request) {
  try {
    console.log('Token refresh request received (cookie auth)');
    
    // Get the refresh token from the httpOnly cookie
    const cookieStore = await cookies(); // Await the cookies() function
    const refreshTokenCookie = cookieStore.get('refreshToken');
    const refreshToken = refreshTokenCookie?.value;
    
    if (!refreshToken) {
      console.log('Missing refresh token cookie');
      return NextResponse.json({
        success: false,
        message: 'Refresh token cookie is required'
      }, { status: 401 }); // Use 401 for missing credentials
    }
    
    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      console.log('Invalid or expired refresh token cookie');
      // Clear potentially invalid cookies if refresh token is bad
      const response = NextResponse.json({
        success: false,
        message: 'Invalid or expired refresh token'
      }, { status: 401 });
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      return response;
    }
    
    const userId = decoded.userId;
    console.log('Refresh token cookie valid for user:', userId);
    
    // --- Optional: Check if refresh token exists in DB (if you store them) ---
    // const db = await initPrisma();
    // const storedToken = await db.userRefreshToken.findUnique({ where: { token: refreshToken } });
    // if (!storedToken || storedToken.userId !== userId || storedToken.expiresAt < new Date()) {
    //   console.log('Refresh token not found in DB or invalid/expired');
    //   return NextResponse.json({ /* ... error ... */ }, { status: 401 });
    // }
    
    // Generate only a new access token
    const newAccessToken = generateAccessToken(userId);
    console.log('Generated new access token for user:', userId);
    
    // --- Create response and set the new access token cookie ---
    const response = NextResponse.json({
      success: true,
      message: 'Token refresh successful'
      // Optionally return non-sensitive user data if needed by frontend after refresh
      // user: { id: userId, name: ..., etc. } 
    }, { status: 200 });

    response.cookies.set('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes in seconds
        path: "/",
        sameSite: 'lax' // Recommended for most cases
    });
    
    // Optionally rotate refresh token (more secure)
    // const newRefreshToken = generateRefreshToken(userId); // Need a separate function
    // response.cookies.set('refreshToken', newRefreshToken, { ... });
    // await storeNewRefreshTokenInDB(userId, newRefreshToken);
    // await deleteOldRefreshTokenFromDB(refreshToken);

    console.log('Set new accessToken cookie successfully.');
    return response;

  } catch (error) {
    console.error('Error refreshing token:', error);
    // Don't clear cookies on unexpected server errors
    return NextResponse.json({
      success: false,
      message: 'Error refreshing token: ' + error.message
    }, { status: 500 });
  } finally {
     // Disconnect prisma if initialized
     if (prisma) {
        await prisma.$disconnect().catch(e => console.error("Error disconnecting prisma:", e));
     }
  }
}