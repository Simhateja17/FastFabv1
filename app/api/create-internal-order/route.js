import { NextResponse } from 'next/server';
import { PaymentMethod } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/app/api/lib/prisma';

export async function POST(request) {
  // TODO: Add proper authentication check
  // const { userId } = getAuth(request);
  // if (!userId) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const {
      orderId,
      userId,
      items,
      totalAmount,
      addressId,
      paymentMethod: paymentMethodString, // Receive as string
      shippingFee,
      tax,
      discount,
      notes
    } = await request.json();

    // --- Basic Validation ---
    if (!orderId || !userId || !items || items.length === 0 || !totalAmount || !paymentMethodString) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }
    if (!items.every(item => item.productId && item.quantity && item.price && item.sellerId)) {
       return NextResponse.json({ error: 'Invalid item structure in order' }, { status: 400 });
    }
    
    // --- Validate Payment Method String ---
    console.log('PaymentMethod Enum Object:', PaymentMethod); // DIAGNOSTIC
    console.log('Values from PaymentMethod Enum:', Object.values(PaymentMethod)); // DIAGNOSTIC
    if (!Object.values(PaymentMethod).includes(paymentMethodString)) {
        console.error(`Invalid payment method string received: ${paymentMethodString}`);
        return NextResponse.json({ error: 'Invalid payment method specified' }, { status: 400 });
    }
    console.log(`Validated payment method string: ${paymentMethodString}`);

    // --- Determine Primary Seller ID ---
    // Count occurrences of each seller in the items
    const sellerCounts = {};
    
    // Count sellers, considering both frequency and item value
    items.forEach(item => {
      if (item.sellerId) {
        // Weight by both quantity and price
        const itemValue = item.quantity * item.price;
        sellerCounts[item.sellerId] = (sellerCounts[item.sellerId] || 0) + itemValue;
      }
    });
    
    // Find the seller with the highest total value
    let primarySellerId = null;
    let maxValue = 0;
    
    Object.entries(sellerCounts).forEach(([sellerId, value]) => {
      if (value > maxValue) {
        maxValue = value;
        primarySellerId = sellerId;
      }
    });
    
    // Fallback to first seller if no primary seller could be determined
    if (!primarySellerId && items.length > 0 && items[0].sellerId) {
      primarySellerId = items[0].sellerId;
      console.log(`No primary seller determined by value weighting, using first item's seller: ${primarySellerId}`);
    }
    
    // Log the primary seller determination
    if (primarySellerId) {
      console.log(`Determined primary seller for order ${orderId}: ${primarySellerId}`);
    } else {
      console.error(`Could not determine primary seller for order ${orderId}. No valid sellerId found in items.`);
      return NextResponse.json({ error: 'Could not determine primary seller for order' }, { status: 400 });
    }

    // Fetch products to get isReturnable status and current sizeQuantities
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, isReturnable: true, sizeQuantities: true }
    });
    
    // Create a lookup map for quick access
    const productMap = products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});

    // Check inventory for all items before processing
    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      
      const sizeQuantities = product.sizeQuantities;
      const currentStock = sizeQuantities[item.size] || 0;
      
      if (currentStock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for product ${item.productId}, size ${item.size}. Available: ${currentStock}, Requested: ${item.quantity}` 
        }, { status: 400 });
      }
    }

    console.log(`Creating internal order record with orderNumber: ${orderId}`);

    // --- Begin a transaction to ensure inventory and order updates are atomic ---
    const createdOrder = await prisma.$transaction(async (prismaClient) => {
      // Update inventory for all ordered items
      for (const item of items) {
        const product = productMap[item.productId];
        const sizeQuantities = { ...product.sizeQuantities };
        sizeQuantities[item.size] = Math.max(0, (sizeQuantities[item.size] || 0) - item.quantity);
        
        await prismaClient.product.update({
          where: { id: item.productId },
          data: { 
            sizeQuantities: sizeQuantities,
            // If all sizes are out of stock, could optionally set isActive to false
          }
        });
        
        console.log(`Updated inventory for product ${item.productId}, size ${item.size}. New quantity: ${sizeQuantities[item.size]}`);
      }
      
      // Create the order after inventory has been updated
      return await prismaClient.order.create({
        data: {
          orderNumber: orderId,
          userId,
          addressId: addressId || null,
          totalAmount,
          paymentMethod: paymentMethodString, // Pass the validated STRING
          shippingFee: shippingFee || 0,
          tax: tax || 0,
          discount: discount || 0,
          notes: notes || null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          primarySellerId: primarySellerId, // Set the determined primary seller
          items: {
            create: items.map(item => ({
              id: uuidv4(),
              productId: item.productId,
              productName: item.productName || 'Product Name TBC',
              sellerId: item.sellerId,
              quantity: item.quantity,
              size: item.size || 'N/A',
              color: item.color || null,
              price: item.price,
              discount: 0,
              isReturnable: productMap[item.productId]?.isReturnable || false, // Copy isReturnable flag from product
              updatedAt: new Date(),
            })),
          },
        },
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          addressId: true,
          address: true,
          totalAmount: true,
          paymentMethod: true,
          shippingFee: true,
          tax: true,
          discount: true,
          notes: true,
          deliveryNotes: true,
          estimatedDelivery: true,
          trackingNumber: true,
          deliveredAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          sellerPhone: true,
          adminNotified: true,
          customerNotified: true,
          primarySellerId: true,
          adminProcessed: true,
          adminNotes: true,
          sellerConfirmed: true,
          status: true,
          paymentStatus: true,
          items: true, // Include order items relation
        }
      });
    });

    console.log(`Successfully created internal order ${createdOrder.id} with orderNumber ${createdOrder.orderNumber}`);

    return NextResponse.json({
      success: true,
      order: createdOrder,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating internal order:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('orderNumber')) {
       return NextResponse.json({ error: 'Order ID conflict. Please try again.' }, { status: 409 });
    }
    // Log the specific Prisma error if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order record';
    console.error('Prisma Error Details:', error?.message, error?.code, error?.meta);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
     // Ensure prisma disconnects even if validation fails early
     // REMOVE: Disconnect handled by shared instance
     // if (prisma) {
     //   await prisma.$disconnect().catch(e => console.error("Error disconnecting prisma:", e));
     // }
  }
} 