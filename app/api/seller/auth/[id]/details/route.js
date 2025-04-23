import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Function to verify the JWT token from cookies
const verifyTokenFromCookies = (request) => {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  
  if (!accessToken) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('[Seller Details] Token verification error:', error.message);
    return null;
  }
};

export async function PUT(request, { params }) {
  console.log('[Seller Details] Received PUT request for seller ID:', params.id);
  
  try {
    // 1. Verify Authentication
    const authResult = verifyTokenFromCookies(request);
    
    if (!authResult || !authResult.sellerId) {
      console.error('[Seller Details] Unauthorized request');
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // 2. Ensure the authenticated seller is updating their own profile
    // or implement admin check if applicable
    if (authResult.sellerId !== params.id) {
      console.error('[Seller Details] Seller ID mismatch:', authResult.sellerId, 'vs', params.id);
      return NextResponse.json({ 
        success: false, 
        message: 'You are not authorized to update this profile' 
      }, { status: 403 });
    }
    
    // 3. Get update data from request body
    const updateData = await request.json();
    console.log(`[Seller Details] Update data received for seller ${params.id}:`, updateData);
    
    // 4. Prepare data for update (only allow specific fields)
    const allowedUpdates = {
      shopName: updateData.shopName,
      ownerName: updateData.ownerName,
      address: updateData.address,
      city: updateData.city,
      state: updateData.state,
      pincode: updateData.pincode,
      openTime: updateData.openTime,
      closeTime: updateData.closeTime,
      categories: updateData.categories,
      gstNumber: updateData.gstNumber,
      bankAccountName: updateData.bankAccountName,
      bankName: updateData.bankName,
      accountNumber: updateData.accountNumber,
      ifsc: updateData.ifsc,
      // Add other fields that are safe to update here
    };
    
    // Remove undefined fields so Prisma doesn't try to set them to null
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );
    
    if (Object.keys(allowedUpdates).length === 0) {
      console.error('[Seller Details] No valid fields provided for update');
      return NextResponse.json({ 
        success: false, 
        message: 'No valid fields provided for update.' 
      }, { status: 400 });
    }
    
    // 5. Update the seller record
    const updatedSeller = await prisma.seller.update({
      where: { id: params.id },
      data: allowedUpdates,
    });
    
    console.log(`[Seller Details] Seller ${params.id} updated successfully`);
    
    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Seller details updated successfully',
      seller: {
        id: updatedSeller.id,
        phone: updatedSeller.phone,
        shopName: updatedSeller.shopName,
        ownerName: updatedSeller.ownerName,
        address: updatedSeller.address,
        city: updatedSeller.city,
        state: updatedSeller.state,
        pincode: updatedSeller.pincode,
        // Include other fields as needed, but exclude sensitive information
      }
    });
    
  } catch (error) {
    console.error('[Seller Details] Error updating seller details:', error);
    
    // Handle Prisma errors specifically
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false, 
        message: 'Seller not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update seller details',
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 