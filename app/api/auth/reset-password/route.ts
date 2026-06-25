import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, phone, otp } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /* ── Phone + OTP flow ── */
    if (phone && otp) {
      const record = await prisma.passwordResetToken.findFirst({
        where: { phone, otp },
        orderBy: { createdAt: "desc" },
      });
      if (!record) return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      if (new Date() > record.expiresAt) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } });
        return NextResponse.json({ error: "Verification code expired" }, { status: 400 });
      }
      await prisma.user.update({ where: { phone }, data: { password: hashedPassword } });
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json({ success: true });
    }

    /* ── Token (email link) flow ── */
    if (!token) return NextResponse.json({ error: "Token or phone+code required" }, { status: 400 });

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    if (new Date() > resetToken.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    await prisma.user.update({ where: { email: resetToken.email }, data: { password: hashedPassword } });
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
