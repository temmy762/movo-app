import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { otpStore } from "../forgot-password/route";

// In-memory reset token store
const resetTokens = new Map<string, { phone: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and code are required" },
        { status: 400 }
      );
    }

    // Get stored OTP
    const stored = otpStore.get(phone);

    if (!stored) {
      return NextResponse.json(
        { error: "Code expired or not requested" },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(phone);
      return NextResponse.json(
        { error: "Code expired" },
        { status: 400 }
      );
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    // Clear OTP
    otpStore.delete(phone);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes

    resetTokens.set(resetToken, { phone, expires });

    return NextResponse.json({ resetToken });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}

export { resetTokens };
