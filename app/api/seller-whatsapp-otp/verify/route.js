import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a more reliable Prisma client with reconnection
let prisma;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 5;

const initPrisma = async () => {
  // Reset the connection if it was previously terminated
  if (prisma) {
    try {
      // Test if the connection is still alive
      await prisma.$queryRaw`SELECT 1`;
      return prisma; // Connection is good
    } catch (e) {
      // Check if it's a termination error (E57P01)
      if (e.message && (e.message.includes('E57P01') || e.message.includes('terminating connection'))) {
        console.log('Previous connection was terminated, creating a new one...');
        await prisma.$disconnect().catch(() => {}); // Ignore errors from disconnect
        prisma = null; // Reset so we create a new client
        connectionAttempts = 0; // Reset attempts counter
      } else {
        throw e; // Re-throw unknown errors
      }
    }
  }
  
  try {
    connectionAttempts++;
    console.log(`Initializing PrismaClient (attempt ${connectionAttempts}/${MAX_ATTEMPTS})...`);
    
    // Create a new PrismaClient instance
    const newPrisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'pretty'
    });
    
    // Test the connection
    await newPrisma.$connect();
    console.log('PrismaClient connected successfully to database');
    
    prisma = newPrisma;
    return prisma;
  } catch (e) {
    console.error('Failed to initialize PrismaClient:', e);
    
    // Special handling for known database termination errors
    if (e.message && (e.message.includes('E57P01') || e.message.includes('terminating connection'))) {
      console.log('Connection was terminated by administrator command. Retrying...');
      if (connectionAttempts < MAX_ATTEMPTS) {
        console.log(`Retrying connection in 2 seconds... (${connectionAttempts}/${MAX_ATTEMPTS})`);
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return initPrisma(); // Recursive retry
      }
    } else if (connectionAttempts < MAX_ATTEMPTS) {
      console.log(`Retrying connection in 1 second... (${connectionAttempts}/${MAX_ATTEMPTS})`);
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initPrisma(); // Recursive retry
    }
    
    // No fallback to in-memory storage, just throw the error
    throw new Error('Failed to connect to database after maximum retry attempts');
  }
};

// Initialize Prisma on module load
initPrisma().catch(e => console.error('Initial Prisma connection failed:', e));

/**
 * Format 10-digit phone number to E.164 format with +91 prefix
 * @param {string} phoneNumber - 10-digit phone number
 * @returns {string} Phone number in E.164 format
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any spaces, dashes, or other characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // If it's already in E.164 format, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }
  
  // If it's a 10-digit number, add +91 prefix (assuming India)
  if (digits.length === 10) {
    return "+91" + digits;
  }
  
  // Otherwise return the original input with + prefix if missing
  return digits.startsWith("91") ? "+" + digits : "+" + digits;
};

/**
 * Verify OTP from database for seller
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  
  console.log('Verifying seller OTP in database for phone:', phoneNumber, 'code:', otpCode);
  
  // Find the latest non-expired OTP
  const otp = await db.whatsAppOTP.findFirst({
    where: {
      phoneNumber,
      expiresAt: { gt: new Date() },
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!otp) {
    console.log('No valid OTP found for this seller phone number');
    return { success: false, message: 'No valid OTP found or OTP has expired' };
  }
  
  console.log('Found seller OTP in database:', otp.id);
  console.log('Comparing input OTP:', otpCode, 'with stored OTP:', otp.otpCode);
  
  if (otp.otpCode === otpCode) {
    // Mark as verified
    await db.whatsAppOTP.update({
      where: { id: otp.id },
      data: { 
        verified: true,
        updatedAt: new Date()
      },
    });
    console.log('Seller OTP verified successfully in database:', otp.id);
    return { success: true };
  }
  
  console.log('OTP code mismatch. Seller verification failed.');
  return { success: false, message: 'Invalid OTP code' };
};

/**
 * Check if seller exists by phone number
 */
const checkSellerExists = async (phoneNumber) => {
  // Format the number for database lookup (remove +91 prefix if present)
  let dbPhone = phoneNumber;
  if (phoneNumber.startsWith('+91')) {
    dbPhone = phoneNumber.substring(3);
  } else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
    dbPhone = phoneNumber.substring(2);
  }
  
  // Make sure Prisma is initialized
  const db = await initPrisma();
  
  const existingSeller = await db.seller.findUnique({
    where: { phone: dbPhone }
  });
  
  if (existingSeller) {
    console.log('Found existing seller with phone number:', phoneNumber);
    
    // Update seller's phone verification status if needed
    if (!existingSeller.isPhoneVerified) {
      await db.seller.update({
        where: { id: existingSeller.id },
        data: { isPhoneVerified: true }
      });
      console.log('Updated seller phone verification status');
    }
    
    return { 
      exists: true, 
      sellerId: existingSeller.id,
      isComplete: !!(existingSeller.shopName && existingSeller.ownerName)
    };
  }
  
  console.log('No existing seller found with phone number:', phoneNumber);
  return { exists: false };
};

export async function POST(request) {
  try {
    const requestData = await request.json();
    
    console.log('OTP verify request:', {
      phoneNumber: requestData.phoneNumber ? 'provided' : 'missing',
      otpCode: requestData.otpCode ? 'provided' : 'missing'
    });
    
    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // Try the correct path for the seller service
    const endpoint = '/api/seller-whatsapp-otp/verify';
    console.log(`Forwarding OTP verification to: ${apiUrl}${endpoint}`);
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    // If that fails with 404, try an alternative endpoint
    if (response.status === 404) {
      console.log('Endpoint not found, trying alternative path');
      
      // Try alternative endpoint path
      const altEndpoint = '/api/auth/verify-otp';
      console.log(`Trying alternative path: ${apiUrl}${altEndpoint}`);
      
      const altResponse = await fetch(`${apiUrl}${altEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log(`Alternative endpoint response: ${altResponse.status} ${altResponse.statusText}`);
      
      // If alternative also fails, fall back to local implementation
      if (altResponse.status === 404) {
        console.log('Both endpoints not found, falling back to local implementation');
        
        // Format phone number
        const phoneNumber = formatPhoneNumber(requestData.phoneNumber);
        const otpCode = requestData.otpCode;
        
        // Attempt to verify OTP
        const verificationResult = await verifyOTP(phoneNumber, otpCode);
        console.log('Verification result:', verificationResult);
        
        if (!verificationResult.success) {
          return NextResponse.json({
            success: false,
            message: verificationResult.message,
            verified: false
          }, { status: 400 });
        }
        
        // Check if a seller already exists with this phone number
        const sellerCheck = await checkSellerExists(phoneNumber);
        
        return NextResponse.json({
          success: true,
          message: 'OTP verified successfully',
          isNewSeller: !sellerCheck.exists,
          isExistingSeller: sellerCheck.exists,
          sellerId: sellerCheck.sellerId || null,
          isSellerComplete: sellerCheck.isComplete || false
        });
      }
      
      // Use the alternative endpoint response
      return handleResponse(altResponse);
    }
    
    // Handle response from primary endpoint
    return handleResponse(response);
    
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to verify OTP', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to handle response
async function handleResponse(response) {
  console.log(`OTP verification response status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    let errorMessage = 'Failed to verify OTP';
    try {
      const errorData = await response.json();
      console.error('OTP verification error data:', errorData);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response from OTP verification');
      try {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
      } catch (textError) {
        // Ignore if we can't get text
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage 
      },
      { status: response.status }
    );
  }
  
  try {
    const data = await response.json();
    console.log('OTP verification successful:', data);
    
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      isNewSeller: data.isNewSeller,
      isExistingSeller: data.isExistingSeller,
      sellerId: data.sellerId,
      isSellerComplete: data.isSellerComplete
    });
  } catch (e) {
    console.error('Failed to parse success response:', e);
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully but got invalid response format'
    });
  }
} 