import { NextResponse } from 'next/server';

// Simple health check endpoint
export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Server encountered an error'
    }, { status: 500 });
  }
} 