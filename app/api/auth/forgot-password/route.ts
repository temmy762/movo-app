import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/reset-password?token=${resetToken}`;

    await sendNotification({
      eventType: "RIDER_PASSWORD_RESET",
      recipient: {
        type: "user",
        id: user.id,
        email: user.email,
        firstName: user.firstName,
      },
      data: {
        resetToken,
        resetUrl,
        expiresAt: expiresAt.toLocaleString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
