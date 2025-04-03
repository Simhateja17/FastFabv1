import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

// Initialize Prisma with a connection pool to handle connection issues gracefully
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Function to generate a unique ID
const generateUniqueId = () => {
  return crypto.randomUUID();
};

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

// Send OTP via WhatsApp using Gupshup API
const sendWhatsAppMessage = async (phoneNumber, otpCode) => {
  if (!API_KEY || !SOURCE_NUMBER || !TEMPLATE_ID || !GUPSHUP_API_URL) {
    throw new Error('Missing Gupshup API configuration');
  }

  // Format message variables for template
  const templateParams = {
    "1": otpCode,
    "2": "10" // OTP validity in minutes
  };

  // Format destination phone number (remove '+' prefix)
  const destination = phoneNumber.startsWith('+') 
    ? phoneNumber.substring(1) 
    : phoneNumber;

  try {
    const response = await axios({
      method: 'post',
      url: GUPSHUP_API_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': API_KEY
      },
      data: new URLSearchParams({
        source: SOURCE_NUMBER,
        destination: destination,
        template: {
          id: TEMPLATE_ID,
          params: JSON.stringify(templateParams)
        },
        src: SRC_NAME,
        channel: 'whatsapp'
      })
    });

    if (response.status === 202 || response.status === 200) {
      console.log('WhatsApp OTP sent successfully', { phoneNumber });
      return { success: true, messageId: response.data.messageId };
    } else {
      console.error('Failed to send WhatsApp OTP', response.data);
      throw new Error(`Failed to send OTP: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp OTP', error.message);
    throw error;
  }
};

/**
 * Store OTP in database with proper error handling
 */
const storeOTP = async (phoneNumber, otpCode, expiresAt) => {
  try {
    // Check for existing OTP for this phone number
    const existingOTP = await prisma.whatsAppOTP.findFirst({
      where: { 
        phoneNumber,
        expiresAt: { 
          gt: new Date() // Not expired
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingOTP) {
      // Update existing OTP
      const updated = await prisma.whatsAppOTP.update({
        where: { id: existingOTP.id },
        data: {
          otpCode,
          expiresAt,
          verified: false,
          updatedAt: new Date()
        }
      });
      
      return { success: true, id: updated.id, updated: true };
    } else {
      // Create new OTP
      const otp = await prisma.whatsAppOTP.create({
        data: {
          id: generateUniqueId(),
          phoneNumber,
          otpCode,
          expiresAt,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return { success: true, id: otp.id, created: true };
    }
  } catch (error) {
    console.error('Failed to store OTP in database:', error);
    
    // Try to handle specific database errors
    if (error.code === 'P2002') {
      // Unique constraint violation - try update instead
      try {
        const updatedOtp = await prisma.whatsAppOTP.updateMany({
          where: { phoneNumber },
          data: {
            otpCode,
            expiresAt,
            verified: false,
            updatedAt: new Date()
          }
        });
        
        return { success: true, updated: true, count: updatedOtp.count };
      } catch (updateError) {
        console.error('Failed to update existing OTP:', updateError);
        throw updateError;
      }
    }
    
    throw error;
  }
};

export async function POST(request) {
  try {
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
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
      }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otpCode = generateOTP();
    console.log('Generated OTP:', otpCode, 'for phone:', phoneNumber);
    
    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in database
    try {
      const storageResult = await storeOTP(phoneNumber, otpCode, expiresAt);
      console.log('OTP storage result:', storageResult);
    } catch (dbError) {
      console.error('Failed to store OTP in database:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database error. Please try again later.'
      }, { status: 500 });
    }

    // Send OTP via WhatsApp
    try {
      const messageResult = await sendWhatsAppMessage(phoneNumber, otpCode);
      console.log('WhatsApp message result:', messageResult);
      
      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully via WhatsApp',
        expiresAt
      });
    } catch (whatsappError) {
      console.error('Failed to send WhatsApp message:', whatsappError);
      
      // Return success even if WhatsApp fails, as we have the OTP stored
      // This helps with debugging in production while not blocking the flow
      return NextResponse.json({
        success: true,
        message: 'OTP generated but could not be sent via WhatsApp. Please try again or contact support.',
        expiresAt,
        error: whatsappError.message
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing OTP request:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error. Please try again later.'
    }, { status: 500 });
  }
}