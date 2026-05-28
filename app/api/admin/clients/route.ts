import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      include: {
        bookings: { select: { id: true, total: true, status: true }, take: 50 },
      },
    });

    const result = users.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email ?? "",
      phone: u.phone ?? "",
      address: [u.street, u.city, u.country].filter(Boolean).join(", "),
      points: u.bookings.filter(b => b.status === "COMPLETED").length * 10,
      totalBookings: u.bookings.length,
      totalSpent: u.bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.total, 0),
      createdAt: u.createdAt,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, street, city, country } = body;
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const { randomBytes, createHash } = await import("crypto");
    const tempPass = randomBytes(10).toString("hex");
    const hashed = createHash("sha256").update(tempPass).digest("hex");

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email:    email    ?? null,
        phone:    phone    ?? null,
        password: hashed,
        street:   street   ?? null,
        city:     city     ?? null,
        country:  country  ?? null,
        role:     "USER",
      },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email or phone already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
