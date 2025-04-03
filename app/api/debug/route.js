import { NextResponse } from 'next/server';

export async function GET(request) {
  // Simple debug endpoint to test API routing
  console.log("Debug endpoint called");
  
  return NextResponse.json({
    success: true,
    message: "Debug endpoint is working",
    timestamp: new Date().toISOString(),
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
} 