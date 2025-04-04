import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Clear authentication cookies - properly awaited
    await cookieStore.delete('accessToken');
    await cookieStore.delete('refreshToken');
    
    // Clear any other user-related cookies if needed
    await cookieStore.delete('userDataCache');
    
    console.log('User logout successful, cleared auth cookies');
    
    // Create response object
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    return response;
  } catch (error) {
    console.error('User logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to logout', error: error.message },
      { status: 500 }
    );
  }
} 