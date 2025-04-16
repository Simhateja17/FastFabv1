import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Correctly import PrismaClient
import { auth } from '@/app/lib/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for raw queries

const prisma = new PrismaClient(); // Instantiate Prisma Client

// Define validation schema for seller details
const sellerDetailsSchema = z.object({
  shopName: z.string().trim().min(1, { message: "Shop name cannot be empty" }).optional(),
  ownerName: z.string().trim().min(1, { message: "Owner name cannot be empty" }).optional(),
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
    .nullable() // Allow null explicitly
    .or(z.string().transform((val, ctx) => {
      if (val === null || val === undefined || val.trim() === '') return null; // Return null for empty/null string
      const num = parseFloat(val);
      if (isNaN(num)) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Latitude must be a valid number or empty" });
         return z.NEVER;
      }
      if (num < -90 || num > 90) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Latitude must be between -90 and 90" });
          return z.NEVER;
      }
      return num;
    })),
  longitude: z.number()
    .refine(val => val >= -180 && val <= 180, { message: "Longitude must be between -180 and 180" })
    .optional()
    .nullable() // Allow null explicitly
    .or(z.string().transform((val, ctx) => {
       if (val === null || val === undefined || val.trim() === '') return null; // Return null for empty/null string
      const num = parseFloat(val);
      if (isNaN(num)) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Longitude must be a valid number or empty" });
         return z.NEVER;
      }
      if (num < -180 || num > 180) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Longitude must be between -180 and 180" });
          return z.NEVER;
      }
      return num;
    })),
  gstNumber: z.string()
    .min(15, { message: "GST Number must be exactly 15 characters" })
    .max(15, { message: "GST Number must be exactly 15 characters" })
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { 
      message: "Invalid GST Number format." 
    })
    .transform(val => val.toUpperCase().replace(/\s+/g, ''))
    // Removed .optional() - it's mandatory now based on user requirement
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
        // Explicitly handle null for lat/lon if needed, otherwise allow Prisma to handle it
        obj[key] = validatedData[key]; 
        return obj;
      }, {});
    
    console.log("Attempting to update seller with data:", detailsToUpdate);

    // Use a transaction to update seller details and location atomically
    const updatedSellerResult = await prisma.$transaction(async (tx) => {
      // 1. Update standard seller details
      const sellerUpdate = await tx.seller.update({
        where: { id: sellerId },
        data: detailsToUpdate,
      });

      console.log("Standard details updated for seller:", sellerId);

      // 2. Update PostGIS location field if lat/lon are valid numbers
      const latitude = validatedData.latitude;
      const longitude = validatedData.longitude;

      if (typeof latitude === 'number' && !isNaN(latitude) && 
          typeof longitude === 'number' && !isNaN(longitude)) {
            
        console.log(`Updating location for seller ${sellerId} with coords: ${longitude}, ${latitude}`);
        
        // Use Prisma's raw SQL execution for PostGIS update
        // IMPORTANT: Use parameterized query ($executeRaw) to prevent SQL injection
        await tx.$executeRaw`UPDATE "Seller" SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE "id" = ${sellerId}`;
        
        console.log(`Successfully updated location field for seller ${sellerId}`);
      } else {
        console.log(`Skipping location update for seller ${sellerId} due to invalid/missing coordinates.`);
         // Optionally set location to NULL if lat/lon are invalid/cleared?
         // await tx.$executeRaw`UPDATE "Seller" SET "location" = NULL WHERE "id" = ${sellerId}`;
      }

      return sellerUpdate; // Return the result of the main update
    });

    console.log("Seller update transaction completed successfully for ID:", sellerId);

    // Return Success Response (using the result from the transaction)
    return NextResponse.json({ success: true, seller: updatedSellerResult });

  } catch (error) {
    console.error("Failed to update seller details:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2025') { // Prisma error code for record not found
         return NextResponse.json({ success: false, message: 'Seller not found' }, { status: 404 });
       }
        // Handle other specific Prisma errors if necessary
        console.error("Prisma Error Code:", error.code);
    }

    // Generic error for other issues (validation, transaction failure, etc.)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }
  // Removed finally block with $disconnect() as Prisma recommends against it for serverless/long-running apps
  // See: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#recommended-connection-management-strategy
} 