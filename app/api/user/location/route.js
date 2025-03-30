import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/app/lib/auth';

const prisma = new PrismaClient();

/**
 * Store user location coordinates
 * This API either updates the user record directly or saves to a default address
 */
export async function POST(request) {
  console.log('Location API called');
  
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
    
    // Get location data from request body
    const requestBody = await request.json();
    const { latitude, longitude } = requestBody;
    
    console.log(`Storing location for user ${userId}:`, { latitude, longitude });
    
    if (latitude === undefined || longitude === undefined) {
      console.error('Missing coordinates in request:', requestBody);
      return NextResponse.json({
        success: false, 
        message: "Missing location coordinates"
      }, { status: 400 });
    }
    
    // Store coordinates with the user's default address if one exists
    // Otherwise create a minimal address record with just the coordinates
    const defaultAddress = await prisma.address.findFirst({
      where: { 
        userId,
        isDefault: true
      }
    });
    
    if (defaultAddress) {
      // Update the existing default address with new coordinates
      const updatedAddress = await prisma.address.update({
        where: { id: defaultAddress.id },
        data: {
          latitude,
          longitude,
          updatedAt: new Date()
        }
      });
      
      console.log('Updated default address with coordinates:', updatedAddress.id);
      
      return NextResponse.json({
        success: true,
        message: "Location coordinates stored with default address",
        data: { addressId: updatedAddress.id }
      });
    } else {
      // Check if we should create a new address record
      // First check if user has any addresses at all
      const addressCount = await prisma.address.count({
        where: { userId }
      });
      
      if (addressCount === 0) {
        // Create a minimal address record with coordinates
        const newAddress = await prisma.address.create({
          data: {
            userId,
            name: "Current Location",
            phone: "",
            line1: "Current Location",
            line2: "",
            city: "",
            state: "",
            pincode: "",
            country: "India",
            isDefault: true,
            latitude,
            longitude
          }
        });
        
        console.log('Created new address with coordinates:', newAddress.id);
        
        return NextResponse.json({
          success: true,
          message: "Location coordinates stored with new address",
          data: { addressId: newAddress.id }
        }, { status: 201 });
      } else {
        // Just store the location data without creating a new address
        console.log('No default address to update, returning success without creating address');
        
        return NextResponse.json({
          success: true,
          message: "Location coordinates received",
          data: { coordinates: { latitude, longitude } }
        });
      }
    }
  } catch (error) {
    console.error("Error storing location:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to store location",
      error: error.message
    }, { status: 500 });
  }
} 