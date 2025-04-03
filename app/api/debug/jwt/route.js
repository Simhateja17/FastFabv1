import { NextResponse } from 'next/server';

export async function GET() {
  // For security, we'll mask the actual secret and just show first and last characters
  const jwtSecret = process.env.JWT_SECRET || 'not-set';
  const maskedSecret = jwtSecret.length > 4 
    ? `${jwtSecret.substring(0, 2)}***${jwtSecret.substring(jwtSecret.length - 2)}`
    : '***';
  
  return NextResponse.json({ 
    jwtSecretStatus: jwtSecret ? 'set' : 'not-set',
    jwtSecretMasked: maskedSecret,
    jwtSecretLength: jwtSecret?.length || 0,
    nodeEnv: process.env.NODE_ENV || 'not-set',
  });
} 