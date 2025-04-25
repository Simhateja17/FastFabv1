import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/app/lib/auth';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

const prisma = new PrismaClient();

// Create new address
export async function POST(request) {
  console.log('Address API called');
  
  try {
    // Log headers for debugging (excluding sensitive data)
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', {
      ...headers,
      authorization: headers.authorization ? 'Bearer [REDACTED]' : undefined,
      cookie: headers.cookie ? '[REDACTED]' : undefined,
    });
    
    // Verify user authentication
    const authResult = await auth(request);
    console.log('Auth result:', { success: authResult.success, message: authResult.message });
    
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.message);
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 });
    }
    
    const userId = authResult.userId;
    console.log('Authenticated user ID:', userId);
    
    // Get address data from request body
    const addressData = await request.json();
    const {
      name,
      phone,
      line1,
      line2,
      city,
      state,
      pincode,
      country = "India",
      isDefault,
      latitude,
      longitude,
    } = addressData;
    
    console.log(`Creating address for user ${userId}:`, { 
      name, line1, city, state, pincode, latitude, longitude 
    });
    
    // Validate required fields
    if (!name || !line1 || !city || !state || !pincode) {
      console.error('Missing required fields in request:', addressData);
      return NextResponse.json({
        success: false, 
        message: "Missing required address fields"
      }, { status: 400 });
    }
    
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If this address is being set as default, unset any existing default
      if (isDefault) {
        console.log('Setting as default address, updating existing defaults');
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      
      // Determine if this is the first address (should be default)
      const addressCount = await tx.address.count({
        where: { userId },
      });
      console.log('Current address count for user:', addressCount);
      
      // Generate a UUID for the address if not provided
      const addressId = addressData.id || uuidv4();
      console.log('Using address ID:', addressId);
      
      // Create the new address
      const newAddress = await tx.address.create({
        data: {
          id: addressId, // Use provided ID or generate a new UUID
          userId,
          name,
          phone: phone || '', // Handle missing phone field
          line1,
          line2,
          city,
          state,
          pincode,
          country,
          isDefault: isDefault || addressCount === 0, // Set as default if first address
          latitude,
          longitude,
          updatedAt: new Date(), // Add updatedAt since it's required
        },
      });
      
      console.log('Created new address with ID:', newAddress.id);
      return newAddress;
    });
    
    return NextResponse.json({
      success: true,
      message: "Address created successfully",
      data: { address: result },
    }, { status: 201 });
    
  } catch (error) {
    console.error("Address creation error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to create address",
      error: error.message
    }, { status: 500 });
  }
}

// Get all addresses for the authenticated user
export async function GET(request) {
  console.log('Get addresses API called');
  
  try {
    // Log headers for debugging (excluding sensitive data)
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', {
      ...headers,
      authorization: headers.authorization ? 'Bearer [REDACTED]' : undefined,
      cookie: headers.cookie ? '[REDACTED]' : undefined,
    });
    
    // Verify user authentication
    const authResult = await auth(request);
    console.log('Auth result:', { success: authResult.success, message: authResult.message });
    
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.message);
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 });
    }
    
    const userId = authResult.userId;
    console.log('Authenticated user ID:', userId);
    
    // Get all addresses for this user
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    
    console.log(`Found ${addresses.length} addresses for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      message: "Addresses retrieved successfully",
      data: { addresses },
    });
    
  } catch (error) {
    console.error("Address retrieval error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to retrieve addresses",
      error: error.message
    }, { status: 500 });
  }
} 