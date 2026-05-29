import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// In-memory OTP store - in production, use Redis or database
const otpStore = new Map<string, { code: string; expires: number }>();

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { phone },
    });

    if (!admin || admin.role !== "ADMIN") {
      // Return success even if not found (security - don't reveal if phone exists)
      return NextResponse.json({ success: true });
    }

    // Generate OTP
    const code = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(phone, { code, expires });

    // TODO: Send SMS with OTP
    // For now, log to console (replace with actual SMS service like Twilio, AWS SNS, etc.)
    console.log(`[ADMIN OTP] Phone: ${phone}, Code: ${code}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Export for use in verify endpoint
export { otpStore };
