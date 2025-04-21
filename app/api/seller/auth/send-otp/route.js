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
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
const GUPSHUP_APP_NAME = process.env.GUPSHUP_SRC_NAME; // Use GUPSHUP_SRC_NAME for app name
const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL || 'https://api.gupshup.io/wa/api/v1/msg'; // Default URL if not set
const TEMPLATE_ID = process.env.GUPSHUP_TEMPLATE_ID; // CORRECTED: Use the existing variable name

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
  } else if (digits.startsWith("+") && digits.length > 1) {
     // Remove leading + if present
     return digits.substring(1);
  }
  // Return potentially invalid number for API to handle error
  return digits; 
};

/**
 * Format phone number to include +91 prefix for database storage
 */
const formatPhoneNumberForDB = (phoneNumber) => {
  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.length === 10) {
    return "+91" + digits;
  } else if (digits.startsWith("91") && digits.length === 12) {
    return "+" + digits;
  } else if (digits.startsWith("+")) {
    return digits;
  }
  return "+" + digits; // Assume it needs a '+'
};

/**
 * Send OTP via Gupshup WhatsApp API
 */
const sendOtpViaWhatsApp = async (phoneNumber, otp) => {
  if (!GUPSHUP_API_KEY || !GUPSHUP_SOURCE_NUMBER || !GUPSHUP_APP_NAME || !TEMPLATE_ID) {
    console.error('Gupshup environment variables are missing (API Key, Source Number, App Name, Seller Template ID)');
    throw new Error('WhatsApp service configuration error.');
  }

  const formattedNumber = formatPhoneNumberForGupshup(phoneNumber);
  console.log(`Sending OTP ${otp} to Gupshup formatted number: ${formattedNumber}`);

  const messagePayload = {
    type: "text",
    text: `Your OTP for Fast&Fab Seller verification is: ${otp}` // Simple text message as fallback
  };

  // If using a template:
  // const messagePayload = {
  //   type: "template",
  //   id: TEMPLATE_ID,
  //   params: [otp] // Ensure params match template structure
  // };

  try {
    const response = await axios.post(GUPSHUP_API_URL, 
      {
        channel: "whatsapp",
        source: GUPSHUP_SOURCE_NUMBER,
        destination: formattedNumber,
        message: JSON.stringify(messagePayload), // Message payload needs to be stringified
        "src.name": GUPSHUP_APP_NAME
      },
      {
        headers: {
          'apikey': GUPSHUP_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Gupshup API response status:', response.status);
    console.log('Gupshup API response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending OTP via Gupshup:', error.response ? error.response.data : error.message);
    throw new Error('Failed to send OTP via WhatsApp');
  }
};

// --- API Route Handler --- 

export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    let { phone: phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Format phone for DB consistency (+91 prefix)
    const dbFormattedPhone = formatPhoneNumberForDB(phoneNumber);

    // --- Check if Seller Exists (Optional but recommended) ---
    // You might want to only send OTPs to registered sellers for sign-in
    // For sign-up, you might skip this check or handle it differently.
    // const seller = await prisma.seller.findUnique({ where: { phone: dbFormattedPhone } });
    // if (!seller) {
    //   console.log(`Seller not found for phone: ${dbFormattedPhone}`);
    //   // Decide whether to return error or proceed for signup flow
    //   // return NextResponse.json({ message: 'Seller not registered' }, { status: 404 }); 
    // }
    
    // Generate OTP
    const otp = generateOTP();
    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    console.log(`Generated OTP ${otp} for ${dbFormattedPhone}, expires at ${expiresAt}`);

    // Save OTP to database (using the same WhatsAppOTP table)
    // Ensure phone numbers are stored consistently (e.g., always with +91)
    try {
        // Delete previous unverified OTPs for this number to avoid conflicts
        await prisma.whatsAppOTP.deleteMany({
            where: {
                phoneNumber: dbFormattedPhone,
                verified: false,
            }
        });
        console.log(`Deleted previous unverified OTPs for ${dbFormattedPhone}`);

        // Create the new OTP record
        await prisma.whatsAppOTP.create({
            data: {
                phoneNumber: dbFormattedPhone,
                otpCode: otp,
                expiresAt: expiresAt,
                verified: false // Initially not verified
            }
        });
        console.log(`Stored OTP ${otp} for ${dbFormattedPhone} in database.`);
    } catch (dbError) {
        console.error("Database error storing OTP:", dbError);
        return NextResponse.json({ message: 'Failed to process OTP request due to database error.' }, { status: 500 });
    }

    // Send OTP via WhatsApp
    await sendOtpViaWhatsApp(dbFormattedPhone, otp);

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to ${dbFormattedPhone}`, // Use consistent format
      expiresAt: expiresAt.toISOString() // Return expiry time
    });

  } catch (error) {
    console.error('Error sending seller OTP:', error);
    return NextResponse.json(
      { 
        message: error.message || 'Failed to send OTP',
        error: error.toString() // Include error string for debugging
      }, 
      { status: 500 }
    );
  }
} 