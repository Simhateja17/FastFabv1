import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers'; // Import cookies helper

const prisma = new PrismaClient();

// Ensure environment variables are loaded
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_SECRET = process.env.JWT_SECRET; // Use the name from .env
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET; // Use the name from .env
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Default to 15 minutes

// if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
if (!JWT_SECRET || !JWT_REFRESH_SECRET) { // Check the correct names
    console.error("Missing required JWT secret environment variables! Check JWT_SECRET and JWT_REFRESH_SECRET.");
    // Optionally throw an error during startup in a real application
}
// hi
export async function POST(request) {
    console.log("Received request at /api/seller/auth/refresh");
    try {
        // Read refresh token from HttpOnly cookie
        const cookieStore = cookies();
        const refreshTokenCookie = cookieStore.get('refreshToken'); // Adjust 'refreshToken' if your cookie name is different

        if (!refreshTokenCookie) {
            console.log("Refresh token cookie missing");
            return NextResponse.json({ message: 'Refresh token required' }, { status: 401 }); // Use 401 for missing credentials
        }

        const refreshToken = refreshTokenCookie.value;

        // if (!REFRESH_TOKEN_SECRET) {
        if (!JWT_REFRESH_SECRET) { // Check the correct name
            console.error("JWT_REFRESH_SECRET is not set");
            return NextResponse.json({ message: 'Internal server error: Configuration missing' }, { status: 500 });
        }

        // Verify the refresh token
        let decoded;
        try {
            // decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
            decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET); // Use the correct secret variable
            console.log("Refresh token verified successfully for sellerId:", decoded.sellerId);
        } catch (err) {
            console.error("Invalid or expired refresh token:", err.message);
            // Distinguish between expired and invalid tokens if needed
            if (err.name === 'TokenExpiredError') {
                return NextResponse.json({ message: 'Refresh token expired' }, { status: 401 });
            }
            return NextResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
        }

        // Optional: Check if refresh token exists in DB / is revoked (if implementing revocation)
        // For now, we trust the signature and expiry from JWT

        // Check if the seller exists
        const seller = await prisma.seller.findUnique({
            where: { id: decoded.sellerId },
        });

        if (!seller) {
            console.log("Seller not found for decoded token:", decoded.sellerId);
            return NextResponse.json({ message: 'Seller not found' }, { status: 401 });
        }

        // Generate a new access token
        // if (!ACCESS_TOKEN_SECRET) {
        if (!JWT_SECRET) { // Check the correct name
            console.error("JWT_SECRET is not set");
            return NextResponse.json({ message: 'Internal server error: Configuration missing' }, { status: 500 });
        }

        const newAccessTokenPayload = { sellerId: seller.id };
        const newAccessToken = jwt.sign(
            newAccessTokenPayload,
            // ACCESS_TOKEN_SECRET,
            JWT_SECRET, // Use the correct secret variable
            { expiresIn: ACCESS_TOKEN_EXPIRY } // Use expiry from env or default
        );

        console.log("Generated new access token for sellerId:", seller.id);

        // Create the response first to set cookies
        const response = NextResponse.json({ success: true }); // Send minimal success payload, or new user details if needed

        // Set the new access token as an HttpOnly cookie
        response.cookies.set('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
            path: '/',
            maxAge: 60 * 15, // 15 minutes (matches token expiry)
            sameSite: 'lax'
        });

        // Optional: Implement refresh token rotation (generate and send a new refresh token)
        // If rotating, generate a new refresh token and set it here as well
        // const newRefreshToken = jwt.sign({ sellerId: seller.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // response.cookies.set('refreshToken', newRefreshToken, { ... same options as accessToken but longer maxAge ... });

        console.log("New access token cookie set.");
        return response;

    } catch (error) {
        console.error('Error during token refresh:', error);
        // Avoid exposing internal details in production
        return NextResponse.json({ message: 'Failed to refresh token' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 