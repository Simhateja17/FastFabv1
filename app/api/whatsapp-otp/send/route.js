import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

// Create a more reliable Prisma client with reconnection
let prisma;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 5; // Increased to give more chances to connect

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
  
  // If it's already a plus format, return as is
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

// Log additional information about environment setup
const debugApiSetup = () => {
  console.log('===== WhatsApp OTP API Debug Info =====');
  console.log('API Key present:', !!API_KEY);
  console.log('Source number:', SOURCE_NUMBER);
  console.log('Source name:', SRC_NAME);
  console.log('Template ID:', TEMPLATE_ID);
  console.log('API URL:', GUPSHUP_API_URL);
  console.log('Database connected:', !!prisma);
  console.log('===== End Debug Info =====');
};

/**
 * Store OTP in database - no fallback to memory
 */
const storeOTP = async (phoneNumber, otpCode, expiresAt) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  // If we get here, we have a database connection
  
  console.log('Storing OTP in database');
  const otp = await db.whatsAppOTP.create({
    data: {
      phoneNumber,
      otpCode,
      expiresAt,
    },
  });
  
  console.log('OTP stored in database with ID:', otp.id);
  return { success: true, id: otp.id };
};

export async function POST(request) {
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
    let { phoneNumber } = body;
    
    console.log('Received request to send OTP to:', phoneNumber);
    
    // Format the phone number (add +91 prefix if it's a 10-digit number)
    phoneNumber = formatPhoneNumber(phoneNumber);
    
    console.log('Formatted phone number:', phoneNumber);

    // Validate phone number (E.164 format)
    if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      console.log('Invalid phone number format:', phoneNumber);
      return NextResponse.json({ 
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
      }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otpCode = generateOTP();
    console.log('Generated OTP:', otpCode, 'for phone:', phoneNumber);
    
    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in database only
    try {
      const storageResult = await storeOTP(phoneNumber, otpCode, expiresAt);
      console.log('OTP storage result:', storageResult);
    } catch (dbError) {
      console.error('Failed to store OTP in database:', dbError);
      return NextResponse.json({
        message: 'Database error. Please try again later.'
      }, { status: 500 });
    }

    // Format destination phone number (remove '+' prefix)
    const destination = phoneNumber.substring(1);
    console.log('Formatted destination phone number:', destination);

    // Check if Gupshup credentials are present
    if (!API_KEY || !SOURCE_NUMBER || !TEMPLATE_ID || !GUPSHUP_API_URL) {
      console.log('Gupshup credentials missing, cannot send WhatsApp OTP');
      return NextResponse.json({
        message: 'OTP generated but cannot be sent to WhatsApp. Please contact support.',
        expiresAt
      }, { status: 500 });
    }

    // Prepare request to Gupshup API
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
        params: [otpCode]
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

      if (response.status >= 200 && response.status < 300) {
        // Return success response
        return NextResponse.json({
          message: 'OTP sent successfully to your WhatsApp number',
          expiresAt
        }, { status: 200 });
      } else {
        console.error('Gupshup API returned non-success status:', response.status);
        console.error('Gupshup API response data:', response.data);
        // Even if WhatsApp delivery fails, return partial success since OTP is stored
        return NextResponse.json({
          message: 'OTP generated but WhatsApp delivery may be delayed',
          expiresAt,
          error: response.data || 'Unknown API error', 
          code: 'GUPSHUP_ERROR'
        }, { status: 200 });
      }
    } catch (apiError) {
      console.error('Error calling Gupshup API:', apiError.message);
      console.error('API Error details:', apiError.response?.data || 'No response data');
      
      // Even if WhatsApp delivery fails, return partial success since OTP is stored
      return NextResponse.json({
        message: 'OTP generated but WhatsApp delivery may be delayed',
        expiresAt,
        error: apiError.message || 'Unknown API error',
        code: 'GUPSHUP_REQUEST_FAILED'
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Overall error in OTP generation:', error);
    
    return NextResponse.json({
      message: 'Failed to generate OTP. Please try again later.'
    }, { status: 500 });
  }
}