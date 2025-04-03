import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'simhateja123';
    
    // Create a test token with a seller ID
    const token = jwt.sign({ 
      sellerId: '12345',
      role: 'seller' 
    }, jwtSecret, { expiresIn: '1h' });
    
    return NextResponse.json({
      success: true,
      token: token,
      decoded: jwt.verify(token, jwtSecret)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 