import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader, sessionDaysFor, mobileToken } from "@/lib/session";

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
    /* Removed by admin (soft delete) — the account can no longer sign in */
    if (driver.deletedAt) {
      return NextResponse.json({ error: "This chauffeur account has been closed. Please contact Movo support." }, { status: 403 });
    }

    const token = await createSession("DRIVER", undefined, driver.id, sessionDaysFor(req));

    return NextResponse.json(
      {
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          status: driver.status,
        },
        ...mobileToken(req, token),
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
