import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ booking: null }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      driverId: session.driverId,
      status: "CONFIRMED",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientName: true,
      pickup: true,
      dropoff: true,
      carName: true,
      total: true,
      fare: true,
      paymentStatus: true,
      status: true,
      startedAt: true,
    },
  });

  return NextResponse.json({ booking: booking ?? null });
}
