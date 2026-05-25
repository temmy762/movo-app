import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab");

  const statusMap: Record<string, string[]> = {
    upcoming: ["PENDING", "CONFIRMED"],
    past: ["COMPLETED"],
    canceled: ["CANCELLED"],
  };

  const statuses = tab ? statusMap[tab] : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session.userId,
      ...(statuses ? { status: { in: statuses as never[] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      carName: true,
      carTier: true,
      pickup: true,
      dropoff: true,
      fare: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ bookings });
}
