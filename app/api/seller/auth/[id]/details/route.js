import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid'; // Make sure to install uuid: npm install uuid

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Create a default beneficiary for a seller during onboarding
 * Simple implementation to create a unique ID
 */
async function createDefaultBeneficiary(sellerId, sellerDetails = {}) {
  try {
    console.log(`[Payout Service] Creating default beneficiary for seller ${sellerId} during onboarding`);
    
    // Check if seller already has a beneficiary ID
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { cashfreeBeneficiaryId: true }
    });
    
    // If beneficiary ID exists, no need to create a new one
    if (seller && seller.cashfreeBeneficiaryId) {
      console.log(`[Payout Service] Seller ${sellerId} already has a beneficiary ID: ${seller.cashfreeBeneficiaryId}`);
      return seller.cashfreeBeneficiaryId;
    }
    
    // Generate a short beneficiary ID (less than 30 chars)
    // Format: s_{first 6 chars of sellerId}_{timestamp suffix}
    const shortSellerId = sellerId.substring(0, 6);
    const timestamp = Date.now().toString().substring(8); // Last 5-6 digits
    const beneficiaryId = `s_${shortSellerId}_${timestamp}`.replace(/-/g, '_');
    
    console.log(`[Payout Service] Generated beneficiary ID: ${beneficiaryId} (${beneficiaryId.length} chars)`);
    
    // Store the beneficiary ID in seller table
    await prisma.seller.update({
      where: { id: sellerId },
      data: { 
        cashfreeBeneficiaryId: beneficiaryId,
        payoutsEnabled: true // Enable payouts now that the beneficiary is set up
      }
    });
    
    console.log(`[Payout Service] Updated seller record with beneficiary ID: ${beneficiaryId}`);
    return beneficiaryId;
  } catch (error) {
    // Log error but don't throw - we don't want to block onboarding if beneficiary creation fails
    console.error(`[Payout Service] Error creating default beneficiary for seller ${sellerId}:`, error);
    console.error(`[Payout Service] Beneficiary will be created during first withdrawal instead`);
    return null;
  }
}

// Function to verify the JWT token from cookies
const verifyTokenFromCookies = async (request) => {
  const cookieStore = await cookies();
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
  const sellerId = params.id; // Store in a variable to avoid async issues
  console.log('[Seller Details] Received PUT request for seller ID:', sellerId);
  
  try {
    // 1. Verify Authentication
    const authResult = await verifyTokenFromCookies(request);
    
    if (!authResult || !authResult.sellerId) {
      console.error('[Seller Details] Unauthorized request');
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // 2. Ensure the authenticated seller is updating their own profile
    // or implement admin check if applicable
    if (authResult.sellerId !== sellerId) {
      console.error('[Seller Details] Seller ID mismatch:', authResult.sellerId, 'vs', sellerId);
      return NextResponse.json({ 
        success: false, 
        message: 'You are not authorized to update this profile' 
      }, { status: 403 });
    }
    
    // 3. Get update data from request body
    const updateData = await request.json();
    console.log(`[Seller Details] Update data received for seller ${sellerId}:`, updateData);
    
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
    
    // Set payoutsEnabled to true when completing onboarding
    allowedUpdates.payoutsEnabled = true;
    
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
      where: { id: sellerId },
      data: allowedUpdates,
    });
    
    console.log(`[Seller Details] Seller ${sellerId} updated successfully`);
    
    // 6. Create a default Cashfree beneficiary ID if not already created
    // This is crucial for enabling withdrawals in the future
    try {
      console.log(`[Seller Details] Checking if seller ${sellerId} already has a cashfreeBeneficiaryId`);
      
      const sellerDetails = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { cashfreeBeneficiaryId: true }
      });
      
      if (!sellerDetails?.cashfreeBeneficiaryId) {
        console.log(`[Seller Details] No existing cashfreeBeneficiaryId found for seller ${sellerId}, creating one...`);
        
        // Create beneficiary with seller details - only pass the fields that exist in your schema
        const beneficiaryId = await createDefaultBeneficiary(sellerId, {
          name: updatedSeller.shopName || updatedSeller.ownerName,
          address: updatedSeller.address,
          city: updatedSeller.city,
          state: updatedSeller.state,
          postalCode: updatedSeller.pincode
        });
        
        if (beneficiaryId) {
          console.log(`[Seller Details] ✅ Successfully created default cashfreeBeneficiaryId for seller ${sellerId}: ${beneficiaryId}`);
          
          // Update our local copy of updatedSeller
          updatedSeller.cashfreeBeneficiaryId = beneficiaryId;
        } else {
          console.warn(`[Seller Details] ⚠️ Could not create cashfreeBeneficiaryId for seller ${sellerId}`);
        }
      } else {
        console.log(`[Seller Details] Seller ${sellerId} already has cashfreeBeneficiaryId: ${sellerDetails.cashfreeBeneficiaryId}`);
      }
    } catch (beneficiaryError) {
      // Log error but don't fail the entire request
      console.error(`[Seller Details] Error creating cashfreeBeneficiaryId:`, beneficiaryError);
      console.error(`[Seller Details] Seller onboarding will continue, but withdrawals may be affected`);
    }
    
    // 7. Return success response
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
        cashfreeBeneficiaryId: updatedSeller.cashfreeBeneficiaryId, // Include the beneficiary ID
        payoutsEnabled: updatedSeller.payoutsEnabled,
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