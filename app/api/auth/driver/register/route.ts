import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, country, city } =
      await req.json();

    if (!firstName || !lastName || !email || !password || !country || !city) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.driver.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const driver = await prisma.driver.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        password: hashed,
        country,
        city,
      },
    });

    const token = await createSession("DRIVER", undefined, driver.id);

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
  } catch {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
