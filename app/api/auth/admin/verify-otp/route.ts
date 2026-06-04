import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and code are required" },
        { status: 400 }
      );
    }

    // Get stored OTP from database
    const storedOTP = await prisma.adminOTP.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!storedOTP) {
      return NextResponse.json(
        { error: "Code expired or not requested" },
        { status: 400 }
      );
    }

    if (new Date() > storedOTP.expiresAt) {
      await prisma.adminOTP.delete({
        where: { id: storedOTP.id },
      });
      return NextResponse.json(
        { error: "Code expired" },
        { status: 400 }
      );
    }

    if (storedOTP.otp !== code) {
      // Increment attempts
      await prisma.adminOTP.update({
        where: { id: storedOTP.id },
        data: { attempts: storedOTP.attempts + 1 },
      });
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    // Clear OTP
    await prisma.adminOTP.delete({
      where: { id: storedOTP.id },
    });

    // Generate and store reset token in database
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.adminResetToken.create({
      data: {
        phone,
        token: resetToken,
        expiresAt,
      },
    });

    return NextResponse.json({ resetToken });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
