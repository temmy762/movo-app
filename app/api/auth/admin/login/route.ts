import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password required" },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { phone },
    });

    if (
      !admin ||
      admin.role !== "ADMIN" ||
      !(await bcrypt.compare(password, admin.password))
    ) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSession("ADMIN", admin.id);

    return NextResponse.json(
      {
        admin: {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
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
