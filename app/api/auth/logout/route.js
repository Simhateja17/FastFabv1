import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Clear authentication cookies - updated to use await
    await cookieStore.delete('accessToken');
    await cookieStore.delete('refreshToken');
    
    // Also forward logout to seller service if needed
    const cookieToken = cookieStore.get('refreshToken')?.value;
    if (cookieToken) {
      try {
        const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: cookieToken }),
        });
      } catch (e) {
        // Ignore errors from seller service logout
        console.error('Error forwarding logout to seller service:', e);
      }
    }
    
    console.log('Logout successful, cleared auth cookies');
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to logout', error: error.message },
      { status: 500 }
    );
  }
} 