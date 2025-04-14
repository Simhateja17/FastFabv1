import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

export async function GET(request) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table') || 'all';
  
  try {
    const results = {};
    
    // Basic connection test
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.connection = "OK";
    } catch (error) {
      results.connection = { error: error.message };
    }
    
    // Table existence check
    if (table === 'all' || table === 'pushSubscription') {
      try {
        const count = await prisma.pushSubscription.count();
        results.pushSubscription = { exists: true, count };
      } catch (error) {
        results.pushSubscription = { exists: false, error: error.message };
      }
    }
    
    if (table === 'all' || table === 'seller') {
      try {
        const count = await prisma.seller.count();
        results.seller = { exists: true, count };
      } catch (error) {
        results.seller = { exists: false, error: error.message };
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Test endpoint for writes
export async function POST(request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { sellerId } = data;
    
    if (!sellerId) {
      return NextResponse.json(
        { error: "sellerId is required" },
        { status: 400 }
      );
    }
    
    const results = {};
    
    // Test if the seller exists
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true }
      });
      
      results.sellerExists = !!seller;
    } catch (error) {
      results.sellerExists = { error: error.message };
    }
    
    // Test push subscription write
    try {
      // Create a test subscription with a unique endpoint
      const testEndpoint = `test-endpoint-${Date.now()}`;
      
      const subscription = await prisma.pushSubscription.create({
        data: {
          endpoint: testEndpoint,
          p256dh: "test-key",
          auth: "test-auth",
          sellerId: sellerId,
          updatedAt: new Date()
        }
      });
      
      // Clean up the test entry right away
      await prisma.pushSubscription.delete({
        where: { id: subscription.id }
      });
      
      results.writeTest = { success: true, id: subscription.id };
    } catch (error) {
      results.writeTest = { success: false, error: error.message, code: error.code };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 