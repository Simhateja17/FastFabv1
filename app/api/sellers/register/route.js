import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { phone } = await request.json();

    // Add your seller registration logic here
    // 1. Validate phone number
    // 2. Check if seller already exists
    // 3. Create new seller record
    // 4. Generate and send OTP

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
