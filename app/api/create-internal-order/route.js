import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  // TODO: Add proper authentication check
  // const { userId } = getAuth(request);
  // if (!userId) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const {
      orderId, // Pre-generated order ID (order_...)
      userId,
      items, // Array of { productId, quantity, price, size, color, sellerId, productName }
      totalAmount,
      addressId, // Optional: ID of the selected address
      paymentMethod, // e.g., 'ONLINE'
      shippingFee,
      tax,
      discount,
      notes
    } = await request.json();

    // --- Basic Validation ---
    if (!orderId || !userId || !items || items.length === 0 || !totalAmount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }
    // Add more validation as needed (e.g., check item structure)
    if (!items.every(item => item.productId && item.quantity && item.price && item.sellerId)) {
       return NextResponse.json({ error: 'Invalid item structure in order' }, { status: 400 });
    }

    console.log(`Creating internal order record with orderNumber: ${orderId}`);

    // --- Create Order in DB ---
    // Use a transaction? Might be overkill if just creating order record here.
    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: orderId, // Use the pre-generated ID here
        userId,
        addressId: addressId || null, // Handle optional address
        totalAmount,
        paymentMethod,
        shippingFee: shippingFee || 0,
        tax: tax || 0,
        discount: discount || 0,
        notes: notes || null,
        status: 'PENDING', // Initial status before payment
        paymentStatus: 'PENDING',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            mrpPrice: item.mrpPrice || item.price, // Use MRP if available
            sellingPrice: item.price, // Use the actual selling price
            size: item.size || null,
            color: item.color || null,
            sellerId: item.sellerId, // Make sure sellerId is included in items array
            name: item.productName || 'Product Name TBC', // Use name if available
            // Calculate total for the item - consider discount/tax application logic here if needed per item
            total: item.quantity * item.price
          })),
        },
        // Other fields like estimatedDelivery can be added later or have defaults
      },
      include: {
         items: true // Optionally include items in the response
      }
    });

    console.log(`Successfully created internal order ${createdOrder.id} with orderNumber ${createdOrder.orderNumber}`);

    return NextResponse.json({
      success: true,
      order: createdOrder,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating internal order:', error);
    // Check for specific Prisma errors if needed
    if (error.code === 'P2002' && error.meta?.target?.includes('orderNumber')) {
       return NextResponse.json({ error: 'Order ID conflict. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 });
  } finally {
     await prisma.$disconnect();
  }
} 