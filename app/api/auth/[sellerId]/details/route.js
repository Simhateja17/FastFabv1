import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/app/lib/auth'; // Corrected alias path
import { z } from 'zod'; // Import zod for validation

const prisma = new PrismaClient();

// Define validation schema for seller details
const sellerDetailsSchema = z.object({
  shopName: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim()
    .regex(/^[0-9]{6}$/, { message: "Pincode must be exactly 6 digits" })
    .optional(),
  openTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Open time must be in HH:MM format" })
    .optional(),
  closeTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Close time must be in HH:MM format" })
    .optional(),
  categories: z.array(z.string()).optional(),
  latitude: z.number()
    .refine(val => val >= -90 && val <= 90, { message: "Latitude must be between -90 and 90" })
    .optional()
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Latitude must be a valid number");
      return num;
    })),
  longitude: z.number()
    .refine(val => val >= -180 && val <= 180, { message: "Longitude must be between -180 and 180" })
    .optional()
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Longitude must be a valid number");
      return num;
    })),
  gstNumber: z.string()
    .min(15, { message: "GST Number must be exactly 15 characters" })
    .max(15, { message: "GST Number must be exactly 15 characters" })
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { 
      message: "Invalid GST Number format. It should follow the pattern: 27AAPFU0939F1ZV" 
    })
    .transform(val => val.toUpperCase().replace(/\s+/g, '')),
});

// Update the function signature to use async/await with params
export async function PATCH(request, context) {
  try {
    // Extract params from context with proper await
    const { params } = context;
    const sellerId = params.sellerId; // Get sellerId from the dynamic route parameter

    // 1. Verify Authentication using the imported 'auth' function
    const authResult = await auth(request);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }
    
    // Get the sellerId from the authentication token
    const authenticatedSellerId = authResult.sellerId;
    
    // 2. Authorization: Check if the authenticated seller is the same as the one being updated
    if (authenticatedSellerId !== sellerId) {
      console.error(`Authorization mismatch: Authenticated Seller ID ${authenticatedSellerId} does not match requested Seller ID ${sellerId}`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // 3. Check if seller exists
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // 4. Process the update
    const requestBody = await request.json();

    // Validate incoming data using Zod
    const validationResult = sellerDetailsSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map(error => ({
        path: error.path.join('.'),
        message: error.message,
      }));
      
      console.error("Validation errors:", validationErrors);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid input data', 
        errors: validationErrors 
      }, { status: 400 });
    }
    
    // Get the validated data
    const validatedData = validationResult.data;
    
    // Filter the update data to only include fields that exist in the Seller model
    // This is a safety measure to prevent errors with fields that don't exist in the database
    const allowedFields = [
      'shopName', 'ownerName', 'address', 'city', 'state', 'pincode',
      'openTime', 'closeTime', 'categories', 'latitude', 'longitude', 'gstNumber'
    ];
    
    const detailsToUpdate = Object.keys(validatedData)
      .filter(key => allowedFields.includes(key) && validatedData[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = validatedData[key];
        return obj;
      }, {});
    
    console.log("Updating seller with data:", detailsToUpdate);

    // Update Seller in Database
    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: detailsToUpdate,
    });

    // Return Success Response
    return NextResponse.json({ success: true, seller: updatedSeller });

  } catch (error) {
    console.error("Failed to update seller details:", error);

    if (error.code === 'P2025') { // Prisma error code for record not found
      return NextResponse.json({ success: false, message: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 