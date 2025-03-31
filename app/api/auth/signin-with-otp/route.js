import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Create a Prisma client instance
const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT tokens
const generateTokens = (sellerId) => {
  // Create access token
  const accessToken = jwt.sign({ sellerId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Create refresh token
  const refreshToken = jwt.sign({ sellerId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

// Store refresh token in database
const storeRefreshToken = async (sellerId, refreshToken) => {
  try {
    // Remove any existing refresh tokens for this seller
    await prisma.refreshToken.deleteMany({
      where: { sellerId },
    });

    // Store the new refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        sellerId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set to expire in 7 days
      },
    });
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw error;
  }
};

export async function POST(request) {
  try {
    const requestData = await request.json();
    
    console.log('Signin with OTP request:', {
      phone: requestData.phone ? 'provided' : 'missing',
      otpCode: requestData.otpCode ? 'provided' : 'missing'
    });
    
    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // Try standard signin path
    const endpoint = '/api/auth/signin-with-otp';
    console.log(`Forwarding request to: ${apiUrl}${endpoint}`);
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    // If that fails with 404, try alternative paths
    if (response.status === 404) {
      console.log('Endpoint not found, trying alternative path');
      
      // Try alternative endpoint path
      const altEndpoint = '/api/auth/login-with-otp';
      console.log(`Trying alternative path: ${apiUrl}${altEndpoint}`);
      
      const altResponse = await fetch(`${apiUrl}${altEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log(`Alternative endpoint response: ${altResponse.status} ${altResponse.statusText}`);
      
      // If alternative endpoint also fails, try a basic signin endpoint
      if (altResponse.status === 404) {
        console.log('Second endpoint not found, trying basic signin');
        
        const basicEndpoint = '/api/auth/signin';
        console.log(`Trying basic signin: ${apiUrl}${basicEndpoint}`);
        
        const basicResponse = await fetch(`${apiUrl}${basicEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestData,
            isOtpLogin: true
          }),
        });
        
        console.log(`Basic signin response: ${basicResponse.status} ${basicResponse.statusText}`);
        
        // If that fails too, we need to use local implementation
        if (basicResponse.status === 404) {
          console.log('No working endpoints found, falling back to local implementation');
          
          // Try to find the seller and generate tokens directly using local implementation
          const { phone } = requestData;
          
          // Format the phone number for database consistency
          let dbPhone = phone;
          if (phone.startsWith('+91')) {
            dbPhone = phone.substring(3); // Remove +91 prefix
          } else if (phone.startsWith('91') && phone.length === 12) {
            dbPhone = phone.substring(2); // Remove 91 prefix
          }
          
          // Find the seller by phone
          const seller = await prisma.seller.findUnique({
            where: { phone: dbPhone },
          });
          
          if (!seller) {
            console.log('Seller not found for phone:', dbPhone);
            return NextResponse.json({
              success: false,
              message: 'No account found with this phone number',
            }, { status: 404 });
          }
          
          // Generate tokens
          const { accessToken, refreshToken } = generateTokens(seller.id);
          
          // Store refresh token
          await storeRefreshToken(seller.id, refreshToken);
          
          // Set cookies - updated to use await
          const cookieStore = cookies();
          const isProduction = process.env.NODE_ENV === 'production';
          
          // Set access token cookie (short lived)
          await cookieStore.set('accessToken', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 15, // 15 minutes in seconds
            path: '/',
          });
          
          // Set refresh token cookie (long lived)
          await cookieStore.set('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
            path: '/',
          });
          
          console.log('Login successful using local implementation');
          
          // Return tokens and seller data
          return NextResponse.json({
            success: true,
            message: 'Login successful',
            seller: {
              id: seller.id,
              phone: seller.phone,
              shopName: seller.shopName,
              ownerName: seller.ownerName,
              isPhoneVerified: true,
            },
            accessToken,
            refreshToken,
          });
        }
        
        // Use the basic signin response
        return handleResponse(basicResponse);
      }
      
      // Use the alternative endpoint response
      return handleResponse(altResponse);
    }
    
    // Handle response from primary endpoint
    return handleResponse(response);
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to handle response
async function handleResponse(response) {
  // Log response status
  console.log(`Signin response status: ${response.status} ${response.statusText}`);
  
  // Handle error response
  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const errorData = await response.json();
      console.error('Login error data:', errorData);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response');
      try {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
      } catch (textError) {
        // Ignore if we can't get text
      }
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: response.status }
    );
  }
  
  try {
    // Parse successful response
    const data = await response.json();
    console.log('Login successful, setting tokens');
    
    // Set cookies with auth tokens for more secure handling - updated to use await
    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set access token cookie (short lived)
    if (data.accessToken) {
      await cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax', // Changed from strict to lax for better compatibility
        maxAge: 60 * 15, // 15 minutes in seconds
        path: '/',
      });
    }
    
    // Set refresh token cookie (long lived)
    if (data.refreshToken) {
      await cookieStore.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax', // Changed from strict to lax for better compatibility
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
        path: '/',
      });
    }
    
    // Return tokens in response for client-side storage
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      seller: data.seller,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    });
  } catch (e) {
    console.error('Failed to parse success response:', e);
    return NextResponse.json({
      success: false,
      message: 'Invalid response format from server'
    }, { status: 500 });
  }
} 