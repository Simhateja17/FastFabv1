import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken, getAdminFromToken } from '@/app/utils/auth';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    // Get user from token - either regular user or admin is fine for validation
    const user = await getUserFromToken(request);
    const admin = await getAdminFromToken(request);
    
    if (!user && !admin) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Use either user ID or admin ID for tracking usage
    const userId = user ? user.id : (admin ? admin.id : null);
    
    // Parse request body
    const { code, orderTotal } = await request.json();
    
    if (!code) {
      return NextResponse.json({ success: false, error: 'Promo code is required' }, { status: 400 });
    }

    // Find the promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    // Check if promo code exists
    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Invalid promo code' }, { status: 404 });
    }

    // Check if promo code is active
    if (!promoCode.isActive) {
      return NextResponse.json({ success: false, error: 'This promo code is inactive' }, { status: 400 });
    }

    // Check if promo code has expired
    const now = new Date();
    if (promoCode.endDate && now > promoCode.endDate) {
      return NextResponse.json({ success: false, error: 'This promo code has expired' }, { status: 400 });
    }

    // Check if promo code has started
    if (now < promoCode.startDate) {
      return NextResponse.json({ success: false, error: 'This promo code is not yet active' }, { status: 400 });
    }

    // Check if promo code has reached usage limit
    if (promoCode.usageLimit !== null && promoCode.usageCount >= promoCode.usageLimit) {
      return NextResponse.json({ success: false, error: 'This promo code has reached its usage limit' }, { status: 400 });
    }

    // Skip user usage check for admins
    if (user && !admin) {
      // Check if user has already used this promo code
      const userUsage = await prisma.promoCodeUsage.count({
        where: {
          userId: userId,
          promoCode: promoCode.code
        }
      });

      if (userUsage >= promoCode.userUsageLimit) {
        return NextResponse.json({ 
          success: false, 
          error: `You've already used this promo code ${promoCode.userUsageLimit} time(s)` 
        }, { status: 400 });
      }
    }

    // Check minimum order value
    if (orderTotal < promoCode.minOrderValue) {
      return NextResponse.json({ 
        success: false, 
        error: `This promo code requires a minimum order of ₹${promoCode.minOrderValue}` 
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'PERCENTAGE') {
      discountAmount = (orderTotal * promoCode.discountValue) / 100;
      
      // Apply maximum discount cap if set
      if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
        discountAmount = promoCode.maxDiscountAmount;
      }
    } else {
      // Fixed amount discount
      discountAmount = promoCode.discountValue;
      
      // Ensure discount doesn't exceed order total
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }
    }

    // Return success with discount information
    return NextResponse.json({
      success: true,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: discountAmount,
        maxDiscountAmount: promoCode.maxDiscountAmount || null
      }
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to validate promo code' }, { status: 500 });
  }
} 