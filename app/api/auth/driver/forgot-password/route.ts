import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { sendSMS } from "@/lib/sms";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string | undefined = body.email;
    const phone: string | undefined = body.phone;

    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
    }

    /* ── Phone / OTP flow ── */
    if (phone) {
      const driver = await prisma.driver.findFirst({ where: { phone } });
      if (!driver) return NextResponse.json({ success: true, method: "phone" });

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.passwordResetToken.create({ data: { email: "", token, expiresAt, phone, otp } });
      await sendSMS(phone, `Your MOVO verification code is: ${otp}. Valid for 10 minutes.`);
      return NextResponse.json({ success: true, method: "phone" });
    }

    /* ── Email / link flow ── */
    const driver = await prisma.driver.findUnique({ where: { email } });
    if (!driver) return NextResponse.json({ success: true, method: "email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.passwordResetToken.create({ data: { email: email!, token: resetToken, expiresAt } });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/driver/onboarding/reset-password?token=${resetToken}`;
    await sendNotification({
      eventType: "RIDER_PASSWORD_RESET",
      recipient: { type: "driver", id: driver.id, email: driver.email, firstName: driver.firstName },
      data: { resetToken, resetUrl, expiresAt: expiresAt.toLocaleString() },
    });

    return NextResponse.json({ success: true, method: "email" });
  } catch (error) {
    console.error("Driver forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
