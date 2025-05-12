import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    // Get URL parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Calculate pagination values
    const skip = (page - 1) * limit;
    
    // Build where clauses for ReturnRequest model
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { orderId: { contains: search } },
        { productName: { contains: search } }
      ];
    }
    
    // Query the ReturnRequest model directly with pagination
    const [returnRequests, totalCount] = await Promise.all([
      prisma.returnRequest.findMany({
        where: whereClause,
        orderBy: {
          submittedAt: 'desc'
        },
        skip,
        take: limit,
        select: {
          id: true,
          orderId: true,
          userId: true,
          reason: true,
          status: true,
          productName: true,
          amount: true,
          submittedAt: true,
        }
      }),
      prisma.returnRequest.count({
        where: whereClause
      })
    ]);
    
    // Fetch user data separately for each return request
    const returnRequestsWithUserData = await Promise.all(
      returnRequests.map(async (request) => {
        const user = await prisma.user.findUnique({
          where: { id: request.userId },
          select: {
            id: true,
            name: true,
            email: true
          }
        });
        
        return {
          ...request,
          userName: user?.name || "Unknown User",
          userEmail: user?.email
        };
      })
    );
    
    // Format the returns data for frontend
    const formattedReturns = returnRequestsWithUserData.map(request => ({
      id: request.id,
      orderId: request.orderId,
      userId: request.userId,
      userName: request.userName,
      userEmail: request.userEmail,
      productName: request.productName || "Unknown Product",
      returnReason: request.reason || "No reason provided",
      status: request.status,
      submittedAt: request.submittedAt,
      amount: request.amount
    }));
    
    // Return the response with pagination info
    return NextResponse.json({
      returns: formattedReturns,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error("Error fetching return requests:", error);
    return NextResponse.json(
      { message: "Failed to fetch return requests", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 