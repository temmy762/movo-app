import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";
import { toE164 } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await req.json();

    const missing: string[] = [];
    if (!firstName) missing.push("First name");
    if (!lastName)  missing.push("Last name");
    if (!email)     missing.push("Email");
    if (!password)  missing.push("Password");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please fill in: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in instead." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone ? toE164(phone.trim()) : null,
        password: hashed,
      },
    });

    const token = await createSession("USER", user.id);

    // Fire welcome email (non-blocking — don't let it delay the response)
    sendNotification({
      eventType: "RIDER_WELCOME",
      recipient: { type: "user", id: user.id, email: user.email, firstName: user.firstName },
    }).catch((e) => console.error("[register] welcome email failed:", e));

    return NextResponse.json(
      { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } },
      {
        status: 201,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const fields = (err.meta?.target as string[]) ?? [];
      if (fields.includes("email")) {
        return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
      }
      if (fields.includes("phone")) {
        return NextResponse.json({ error: "This phone number is already linked to another account." }, { status: 409 });
      }
      return NextResponse.json({ error: `This ${fields.join(", ")} is already in use.` }, { status: 409 });
    }
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: "We couldn't create your account right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
