import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

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

export async function POST(request) {
    console.log("Received request at /api/seller/auth/refresh");
    try {
        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken) {
            console.log("Refresh token missing in request");
            return NextResponse.json({ message: 'Refresh token required' }, { status: 400 });
        }

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

        // Optional: Implement refresh token rotation (generate and send a new refresh token)
        // For simplicity, we are not rotating refresh tokens here.

        return NextResponse.json({ accessToken: newAccessToken });

    } catch (error) {
        console.error('Error during token refresh:', error);
        // Avoid exposing internal details in production
        return NextResponse.json({ message: 'Failed to refresh token' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 