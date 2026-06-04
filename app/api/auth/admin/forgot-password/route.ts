import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this phone
    await prisma.adminOTP.deleteMany({
      where: { phone },
    });

    // Store OTP in database
    await prisma.adminOTP.create({
      data: {
        phone,
        otp,
        expiresAt,
      },
    });

    // TODO: Send SMS with OTP
    // For now, log to console (replace with actual SMS service like Twilio, AWS SNS, etc.)
    console.log(`[ADMIN OTP] Phone: ${phone}, Code: ${otp}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
