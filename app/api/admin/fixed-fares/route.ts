/**
 * Customer fixed fares (agreed prices for a customer's regular routes).
 *   GET  → all fixed fares with the customer's name
 *   POST { userId, label, pickup, dropoff, tier, fare, weekdays }
 */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseFixedFareInput } from "@/lib/customerFixedFareInput";

const withCustomer = { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } };

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const fares = await prisma.customerFixedFare.findMany({
      include: withCustomer,
      orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ fares });
  } catch (e) {
    console.error("[admin fixed-fares GET]", e);
    return NextResponse.json({ error: "Failed to load fixed fares" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const user = typeof body.userId === "string"
      ? await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, role: true } })
      : null;
    if (!user || user.role !== "USER") return NextResponse.json({ error: "Choose a customer" }, { status: 400 });

    const parsed = await parseFixedFareInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const fare = await prisma.customerFixedFare.create({
      data: { ...parsed.data, userId: user.id } as Prisma.CustomerFixedFareUncheckedCreateInput,
      include: withCustomer,
    });
    return NextResponse.json({ fare }, { status: 201 });
  } catch (e) {
    console.error("[admin fixed-fares POST]", e);
    return NextResponse.json({ error: "Failed to save fixed fare" }, { status: 500 });
  }
}
