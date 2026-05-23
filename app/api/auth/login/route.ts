import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password } = await req.json();

    if (!password || (!email && !phone)) {
      return NextResponse.json(
        { error: "Email or phone required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSession(user.role, user.id);

    return NextResponse.json(
      { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } },
      {
        status: 200,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      }
    );
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
