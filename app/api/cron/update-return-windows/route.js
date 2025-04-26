import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/cron/update-return-windows
 * 
 * Cron job endpoint to process return window transitions automatically.
 * - Finds items with ACTIVE status whose return window has ended
 * - Updates their status to COMPLETED
 * - Creates earnings records with proper commission calculations
 * - Updates seller balance with the net amount after commission
 * 
 * This should be called by a cron job scheduler (e.g., Vercel Cron)
 * Security: In production, this should be secured with a token or API key
 */
export async function GET(request) {
  try {
    // In production, add security check here
    // const apiKey = request.headers.get("x-api-key");
    // if (apiKey !== process.env.CRON_API_KEY) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    
    const now = new Date();
    
    // Find items whose return window has ended but still have ACTIVE status
    const itemsToUpdate = await prisma.orderItem.findMany({
      where: {
        returnWindowStatus: 'ACTIVE',
        returnWindowEnd: {
          lt: now // Return window end date is in the past
        },
        earningsCredited: false // Only get items that haven't been credited yet
      },
      include: {
        seller: true,
        product: true,
        order: true
      }
    });
    
    console.log(`Found ${itemsToUpdate.length} items with expired return windows to process`);
    
    // Process each item
    const results = [];
    
    for (const item of itemsToUpdate) {
      try {
        // Calculate the amount to credit
        const itemAmount = item.price * item.quantity;
        const commissionRate = 0.08; // 8% for returnable items
        const commissionAmount = itemAmount * commissionRate;
        const netAmount = itemAmount - commissionAmount;
        
        // Use a transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
          // 1. Update the item status
          const updatedItem = await tx.orderItem.update({
            where: { id: item.id },
            data: {
              returnWindowStatus: 'COMPLETED',
              earningsCredited: true,
              earningsCreditedAt: now
            }
          });
          
          // 2. Create an earning record
          const earning = await tx.sellerEarning.create({
            data: {
              sellerId: item.sellerId,
              orderItemId: item.id,
              amount: netAmount,
              commission: commissionAmount,
              type: 'POST_RETURN_WINDOW',
              status: 'COMPLETED',
              creditedToBalance: true,
              creditedAt: now
            }
          });
          
          // 3. Increment seller balance (using net amount)
          const updatedSeller = await tx.seller.update({
            where: { id: item.sellerId },
            data: {
              balance: {
                increment: netAmount
              }
            }
          });
          
          return {
            item: updatedItem,
            earning,
            netAmount,
            commissionAmount,
            newSellerBalance: updatedSeller.balance
          };
        });
        
        console.log(`Successfully processed item ${item.id}: Added ₹${result.netAmount.toFixed(2)} to seller ${item.sellerId}'s balance (Commission: ₹${result.commissionAmount.toFixed(2)})`);
        results.push({
          status: 'success',
          itemId: item.id,
          sellerId: item.sellerId,
          grossAmount: itemAmount,
          commission: result.commissionAmount,
          netAmount: result.netAmount,
          newBalance: result.newSellerBalance
        });
        
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        results.push({
          status: 'error',
          itemId: item.id,
          sellerId: item.sellerId,
          error: itemError.message
        });
      }
    }
    
    return NextResponse.json({
      processed: itemsToUpdate.length,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length,
      results
    });
    
  } catch (error) {
    console.error("Error updating return windows:", error);
    return NextResponse.json(
      { error: "Failed to update return windows" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 