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
    
    // Create a new PrismaClient instance with better timeout settings
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
  
  // If it's a 10-digit number, add +91 prefix (for India)
  if (digits.length === 10) {
    return "+91" + digits;
  }
  
  // If it starts with 91 and has 12 digits total, add + prefix
  if (digits.startsWith("91") && digits.length === 12) {
    return "+" + digits;
  }
  
  // Otherwise return with + prefix if missing
  return digits.startsWith("91") ? "+" + digits : "+" + digits;
};

// Function to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get Gupshup API details from environment variables
const API_KEY = process.env.GUPSHUP_API_KEY;
const SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
const SRC_NAME = process.env.GUPSHUP_SRC_NAME;
const TEMPLATE_ID = process.env.GUPSHUP_TEMPLATE_ID;
const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL;

/**
 * Store OTP in database for seller
 */
const storeOTP = async (phoneNumber, otpCode, expiresAt) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  
  console.log('Storing seller OTP in database');
  
  try {
    const otp = await db.whatsAppOTP.create({
      data: {
        phoneNumber,
        otpCode,
        expiresAt,
        updatedAt: new Date(), // Explicitly set updatedAt to ensure compatibility
      },
    });
    
    console.log('Seller OTP stored in database with ID:', otp.id);
    return { success: true, id: otp.id };
  } catch (error) {
    console.error('Failed to store seller OTP in database:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a unique constraint violation, try to update instead
    if (error.code === 'P2002') {
      console.log('Unique constraint violation, trying to update existing record');
      
      try {
        const updatedOtp = await db.whatsAppOTP.updateMany({
          where: { 
            phoneNumber,
            expiresAt: { gt: new Date() } // Only update non-expired OTPs
          },
          data: {
            otpCode,
            expiresAt,
            updatedAt: new Date(),
          },
        });
        
        if (updatedOtp.count > 0) {
          console.log(`Updated ${updatedOtp.count} existing OTP record(s)`);
          return { success: true, updated: true, count: updatedOtp.count };
        }
      } catch (updateError) {
        console.error('Failed to update existing OTP:', updateError);
      }
    }
    
    throw error;
  }
};

/**
 * Check if a seller exists with the given phone number
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
  
  try {
    // Use select to only get needed fields to avoid schema mismatches
    const existingSeller = await db.seller.findUnique({
      where: { phone: dbPhone },
      select: { 
        id: true,
        phone: true,
        shopName: true,
        ownerName: true 
      }
    });
    
    console.log('Seller lookup result:', existingSeller ? 'Found' : 'Not found');
    
    if (existingSeller) {
      console.log('Found existing seller with phone number:', phoneNumber);
      return { 
        exists: true, 
        sellerId: existingSeller.id,
        isComplete: !!(existingSeller.shopName && existingSeller.ownerName)
      };
    }
    
    console.log('No existing seller found with phone number:', phoneNumber);
    return { exists: false };
  } catch (error) {
    console.error('Error checking seller existence:', error);
    // Return false to avoid blocking the OTP flow on schema errors
    return { exists: false, error: error.message };
  }
};

/**
 * Send WhatsApp OTP via Gupshup service
 */
const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  // If Gupshup credentials are missing, log and return mock success
  if (!API_KEY || !SOURCE_NUMBER || !TEMPLATE_ID || !GUPSHUP_API_URL) {
    console.log('[MOCK] Would send OTP', otpCode, 'to', phoneNumber);
    return { success: true, mock: true };
  }
  
  try {
    // Format destination (remove + from phone number)
    const destination = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    
    console.log('Sending OTP to:', destination, 'with code:', otpCode);
    console.log('Using API URL:', GUPSHUP_API_URL);
    console.log('Using Template ID:', TEMPLATE_ID);
    
    // Create form data object for template message
    const formData = new URLSearchParams();
    formData.append('source', SOURCE_NUMBER);
    formData.append('destination', destination);
    formData.append('template', JSON.stringify({
      id: TEMPLATE_ID,
      params: [otpCode, "10"]  // OTP code and expiry time in minutes
    }));
    
    // Log the exact request being sent
    console.log('Request body:', formData.toString());
    console.log('Headers:', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'apikey': API_KEY.substring(0, 10) + '...' // Log partial API key for security
    });
    
    // Make the HTTP request to Gupshup API with form-encoded data
    const response = await fetch(GUPSHUP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': API_KEY,
      },
      body: formData.toString(),
    });
    
    // Log the full response for debugging
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers]));
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.error('Gupshup API error:', response.status, responseText);
      throw new Error(`Gupshup API responded with ${response.status}: ${responseText}`);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('Response was not JSON, using text response');
      data = { rawResponse: responseText };
    }
    
    console.log('Gupshup API response processed:', data);
    
    return { success: true, apiResponse: data };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

export async function POST(request) {
  try {
    const requestData = await request.json();
    
    console.log('Send OTP request:', {
      phoneNumber: requestData.phoneNumber ? 'provided' : 'missing'
    });
    
    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // Try the correct path for the seller service - seller-whatsapp-otp or auth/send-otp
    const endpoint = '/api/seller-whatsapp-otp/send';
    console.log(`Forwarding OTP send request to: ${apiUrl}${endpoint}`);
    
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
      const altEndpoint = '/api/auth/send-otp';
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
        
        // Format the phone number (add +91 prefix if it's a 10-digit number)
        const phoneNumber = formatPhoneNumber(requestData.phoneNumber);
        
        // Generate a 6-digit OTP
        const otpCode = generateOTP();
        console.log('Generated OTP:', otpCode, 'for phone:', phoneNumber);
        
        // Calculate expiration time (10 minutes from now)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        // Store OTP in database
        try {
          await storeOTP(phoneNumber, otpCode, expiresAt);
        } catch (dbError) {
          console.error('Failed to store OTP in database:', dbError);
          return NextResponse.json({
            success: false,
            message: 'Database error. Please try again later.'
          }, { status: 500 });
        }
        
        // Check if this is an existing seller or new registration
        const sellerCheck = await checkSellerExists(phoneNumber);
        
        // Send OTP via WhatsApp
        const whatsappResult = await sendWhatsAppOTP(phoneNumber, otpCode);
        
        return NextResponse.json({
          success: true,
          message: "OTP sent successfully to your WhatsApp number",
          expiresAt,
          isExistingSeller: sellerCheck.exists,
        });
      }
      
      // Use the alternative endpoint response
      return handleResponse(altResponse);
    }
    
    // Handle response from primary endpoint
    return handleResponse(response);
    
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send OTP', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to handle response
async function handleResponse(response) {
  console.log(`OTP send response status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    let errorMessage = 'Failed to send OTP';
    try {
      const errorData = await response.json();
      console.error('OTP send error data:', errorData);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response from OTP send');
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
    console.log('OTP sent successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      expiresAt: data.expiresAt,
      isExistingSeller: data.isExistingSeller
    });
  } catch (e) {
    console.error('Failed to parse success response:', e);
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully but got invalid response format'
    });
  }
} 