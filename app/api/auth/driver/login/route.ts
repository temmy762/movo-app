import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({ where: { email } });

    if (!driver || !(await bcrypt.compare(password, driver.password))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

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
        status: 200,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      }
    );
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
