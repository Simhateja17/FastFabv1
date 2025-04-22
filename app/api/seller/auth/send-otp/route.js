import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// --- Prisma Client Initialization (Consider moving to a lib file) ---
let prisma;
try {
  prisma = new PrismaClient({
    log: ['warn', 'error']
  });
} catch (e) {
  console.error("Failed to initialize Prisma Client:", e);
  prisma = null; // Ensure prisma is null if initialization fails
}

// --- Gupshup Configuration --- 
const API_KEY = process.env.GUPSHUP_API_KEY;
const SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
const SRC_NAME = process.env.GUPSHUP_SRC_NAME; // Use GUPSHUP_SRC_NAME for app name
const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL || 'https://api.gupshup.io/wa/api/v1/msg'; // Default URL if not set
const TEMPLATE_ID = process.env.GUPSHUP_TEMPLATE_ID; // CORRECTED: Use the existing variable name

// Debug API setup
const debugApiSetup = () => {
  console.log('===== Seller WhatsApp OTP API Debug Info =====');
  console.log('API Key present:', !!API_KEY);
  console.log('Source number:', SOURCE_NUMBER);
  console.log('Source name:', SRC_NAME);
  console.log('Template ID:', TEMPLATE_ID);
  console.log('API URL:', GUPSHUP_API_URL);
  console.log('Database connected:', !!prisma);
  console.log('===== End Debug Info =====');
};

// --- Helper Functions --- 

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Format phone number to E.164 international format (without +)
 * Gupshup requires the number without the leading '+'
 */
const formatPhoneNumberForGupshup = (phoneNumber) => {
  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    // Already includes country code, use as is
    return digits;
  } else if (digits.length === 10) {
    // Add 91 prefix
    return "91" + digits;
  } else if (phoneNumber.startsWith("+") && phoneNumber.length > 1) {
     // Remove leading + if present
     return phoneNumber.substring(1);
  }
  // Return potentially invalid number for API to handle error
  return digits; 
};

/**
 * Format phone number to include +91 prefix for database storage
 */
const formatPhoneNumberForDB = (phoneNumber) => {
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

// --- API Route Handler --- 

export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
  }
  
  try {
    // Run debug checks
    debugApiSetup();
    
    // Debug environment variables
    console.log('GUPSHUP ENV VARS:', {
      API_KEY: API_KEY ? 'Present (hidden)' : 'Missing',
      SOURCE_NUMBER: SOURCE_NUMBER,
      SRC_NAME: SRC_NAME,
      TEMPLATE_ID: TEMPLATE_ID,
      GUPSHUP_API_URL: GUPSHUP_API_URL
    });
    
    const body = await request.json();
    let { phone: phoneNumber } = body;

    console.log('Received seller OTP request body:', body);
    console.log('Extracted phone number:', phoneNumber);
    
    if (!phoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Format phone for DB consistency (+91 prefix)
    phoneNumber = formatPhoneNumberForDB(phoneNumber);
    console.log('Formatted phone number for DB:', phoneNumber);

    // Validate phone number (E.164 format)
    if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      console.log('Invalid phone number format:', phoneNumber);
      return NextResponse.json({ 
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
      }, { status: 400 });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`Generated OTP ${otp} for ${phoneNumber}, expires at ${expiresAt}`);

    // Save OTP to database
    try {
        // Delete previous unverified OTPs for this number to avoid conflicts
        await prisma.whatsAppOTP.deleteMany({
            where: {
                phoneNumber: phoneNumber,
                verified: false,
            }
        });
        console.log(`Deleted previous unverified OTPs for ${phoneNumber}`);

        // Create the new OTP record
        await prisma.whatsAppOTP.create({
            data: {
                phoneNumber: phoneNumber,
                otpCode: otp,
                expiresAt: expiresAt,
                verified: false, // Initially not verified
                updatedAt: new Date(), // Explicitly set updatedAt
            }
        });
        console.log(`Stored OTP ${otp} for ${phoneNumber} in database.`);
    } catch (dbError) {
        console.error("Database error storing OTP:", dbError);
        return NextResponse.json({ message: 'Failed to process OTP request due to database error.' }, { status: 500 });
    }

    // Check if Gupshup credentials are present
    if (!API_KEY || !SOURCE_NUMBER || !TEMPLATE_ID || !GUPSHUP_API_URL) {
      console.log('Gupshup credentials missing, cannot send WhatsApp OTP');
      return NextResponse.json({
        message: 'OTP generated but cannot be sent to WhatsApp. Please contact support.',
        expiresAt
      }, { status: 500 });
    }

    // Format destination phone number (remove '+' prefix)
    const destination = phoneNumber.substring(1);
    console.log('Sending OTP to Gupshup formatted number:', destination);

    // Prepare WhatsApp API request - MATCH EXACTLY THE USER IMPLEMENTATION
    try {
      // Prepare the request body as a URLSearchParams object like the working implementation
      const requestBody = new URLSearchParams();
      requestBody.append('source', SOURCE_NUMBER);
      if (SRC_NAME) {
        requestBody.append('source.name', SRC_NAME);
      }
      requestBody.append('destination', destination);
      const templateData = JSON.stringify({
        id: TEMPLATE_ID,
        params: [otp]
      });
      requestBody.append('template', templateData);

      console.log('Sending to Gupshup API with params:', {
        source: SOURCE_NUMBER,
        sourceName: SRC_NAME,
        destination,
        templateData,
        apiUrl: GUPSHUP_API_URL
      });

      // Call the Gupshup API with format matching the working implementation
      const response = await axios.post(
        GUPSHUP_API_URL,
        requestBody,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Apikey': API_KEY
          }
        }
      );
      
      console.log('Gupshup API response status:', response.status);
      console.log('Gupshup API response data:', response.data);

      if (response.status >= 200 && response.status < 300) {
        // Return success response
        return NextResponse.json({
          success: true,
          message: 'OTP sent successfully to your WhatsApp number',
          expiresAt: expiresAt.toISOString()
        }, { status: 200 });
      } else {
        console.error('Gupshup API returned non-success status:', response.status);
        console.error('Gupshup API response data:', response.data);
        // Even if WhatsApp delivery fails, return partial success since OTP is stored
        return NextResponse.json({
          success: true,
          message: 'OTP generated but WhatsApp delivery may be delayed',
          expiresAt: expiresAt.toISOString(),
          error: response.data || 'Unknown API error', 
          code: 'GUPSHUP_ERROR'
        }, { status: 200 });
      }
    } catch (apiError) {
      console.error('Error calling Gupshup API:', apiError.message);
      console.error('API Error details:', apiError.response?.data || 'No response data');
      
      // Even if WhatsApp delivery fails, return partial success since OTP is stored
      return NextResponse.json({
        success: true,
        message: 'OTP generated but WhatsApp delivery may be delayed',
        expiresAt: expiresAt.toISOString(),
        error: apiError.message || 'Unknown API error',
        code: 'GUPSHUP_REQUEST_FAILED'
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Overall error in Seller OTP generation:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to generate OTP. Please try again later.'
    }, { status: 500 });
  }
}