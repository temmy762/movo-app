import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toE164 } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      company: true,
      street: true,
      postCode: true,
      city: true,
      country: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, title, company, street, postCode, city, country } = body;

    const data: Record<string, string | null> = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone ? toE164(phone.trim()) : null;
    if (title !== undefined) data.title = title || null;
    if (company !== undefined) data.company = company || null;
    if (street !== undefined) data.street = street || null;
    if (postCode !== undefined) data.postCode = postCode || null;
    if (city !== undefined) data.city = city || null;
    if (country !== undefined) data.country = country || null;

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        title: true,
        company: true,
        street: true,
        postCode: true,
        city: true,
        country: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err: unknown) {
    console.error("[PATCH /api/user/profile] error:", err);
    const prismaErr = err as { code?: string; meta?: { target?: string[] }; message?: string };
    if (prismaErr?.code === "P2002") {
      const fields = prismaErr.meta?.target ?? [];
      if (fields.includes("email")) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      if (fields.includes("phone")) return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });
    }
    const detail = prismaErr?.message ?? "Failed to update profile";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
