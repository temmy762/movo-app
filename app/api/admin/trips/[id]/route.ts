import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  const [booking, locations] = await Promise.all([
    prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id: true, status: true, clientName: true,
        pickup: true, dropoff: true, carName: true,
        startedAt: true, completedAt: true, createdAt: true,
        driver: { select: { id: true, firstName: true, lastName: true, lat: true, lng: true } },
      },
    }),
    prisma.tripLocation.findMany({
      where:   { bookingId },
      orderBy: { timestamp: "asc" },
      select:  { lat: true, lng: true, heading: true, speed: true, timestamp: true },
    }),
  ]);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    booking,
    route: locations,
    totalPoints: locations.length,
  });
}
