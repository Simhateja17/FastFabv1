import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken, getAdminFromToken } from '@/app/utils/auth';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    // Get user from token - either regular user or admin is fine for applying promos
    const user = await getUserFromToken(request);
    const admin = await getAdminFromToken(request);
    
    if (!user && !admin) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Use either user ID or admin ID for tracking usage
    const userId = user ? user.id : (admin ? admin.id : null);

    // Parse request body
    const { code, orderId, discountAmount } = await request.json();
    
    if (!code || !orderId || discountAmount === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promo code, order ID, and discount amount are required' 
      }, { status: 400 });
    }

    // Find the promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Invalid promo code' }, { status: 404 });
    }

    // Record promo code usage
    await prisma.$transaction(async (tx) => {
      // Increment usage count
      await tx.promoCode.update({
        where: { id: promoCode.id },
        data: { usageCount: { increment: 1 } }
      });

      // Record user usage
      await tx.promoCodeUsage.create({
        data: {
          userId: userId,
          promoCode: promoCode.code,
          orderId: orderId,
          discountAmount: discountAmount
        }
      });

      // Update order with discount if needed
      // This depends on your order model structure
      await tx.order.update({
        where: { id: orderId },
        data: { discount: discountAmount }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Promo code applied successfully'
    });

  } catch (error) {
    console.error('Error applying promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply promo code' }, { status: 500 });
  }
} 