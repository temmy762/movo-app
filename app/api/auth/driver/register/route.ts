import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";
import { toE164 } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, country, city } =
      await req.json();

    const missing: string[] = [];
    if (!firstName) missing.push("First name");
    if (!lastName)  missing.push("Last name");
    if (!email)     missing.push("Email");
    if (!password)  missing.push("Password");
    if (!country)   missing.push("Country");
    if (!city)      missing.push("City");
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

    const existing = await prisma.driver.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A driver account with this email already exists. Try logging in instead." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const driver = await prisma.driver.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone ? toE164(phone.trim()) : null,
        password: hashed,
        country,
        city,
      },
    });

    const token = await createSession("DRIVER", undefined, driver.id);

    // Send welcome email (non-blocking)
    sendNotification({
      eventType: "CHAUFFEUR_WELCOME",
      recipient: {
        type: "driver",
        id: driver.id,
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
      },
    }).catch(err => console.error("Welcome email failed:", err));

    return NextResponse.json(
      {
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          status: driver.status,
        },
      },
      {
        status: 201,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const fields = (err.meta?.target as string[]) ?? [];
      if (fields.includes("email")) {
        return NextResponse.json({ error: "A driver account with this email already exists. Try logging in instead." }, { status: 409 });
      }
      if (fields.includes("phone")) {
        return NextResponse.json({ error: "This phone number is already linked to another driver account." }, { status: 409 });
      }
      return NextResponse.json({ error: `This ${fields.join(", ")} is already in use.` }, { status: 409 });
    }
    console.error("[driver register] error:", err);
    return NextResponse.json(
      { error: "We couldn't create your account right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
