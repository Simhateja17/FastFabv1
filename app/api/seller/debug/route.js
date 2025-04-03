import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Get seller ID from token
const getSellerIdFromToken = (token) => {
  try {
    // Use the environment variable with a fallback for development
    const jwtSecret = process.env.JWT_SECRET || 'simhateja123';
    const decoded = jwt.verify(token, jwtSecret);
    return decoded.sellerId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export async function GET(request) {
  console.log('[DEBUG] GET /api/seller/debug');
  
  try {
    // Get token from cookies or authorization header
    const cookieStore = cookies();
    let accessToken = cookieStore.get('accessToken')?.value;
    
    // Try to get from authorization header if not in cookies
    if (!accessToken && request.headers.has('authorization')) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    if (!accessToken) {
      console.error('No access token found');
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get seller ID from token
    const sellerId = getSellerIdFromToken(accessToken);
    if (!sellerId) {
      return NextResponse.json(
        { message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Return the decoded token information
    const jwtSecret = process.env.JWT_SECRET || 'simhateja123';
    const decoded = jwt.verify(accessToken, jwtSecret);
    
    return NextResponse.json({
      success: true,
      message: 'Token validated successfully',
      sellerId: sellerId,
      tokenInfo: {
        ...decoded,
        // Don't expose the full token data like IAT and EXP
        iat: undefined,
        exp: undefined
      },
      jwtSecretUsed: jwtSecret === 'simhateja123' ? 'fallback' : 'environment',
    });
  } catch (error) {
    console.error('Error in debug API route:', error);
    return NextResponse.json(
      { message: 'Failed to process request', error: error.message },
      { status: 500 }
    );
  }
} 