import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const session = await getSession(req);

    // Fetch booking with driver and vehicle info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            lat: true,
            lng: true,
            vehicle: {
              select: {
                make: true,
                model: true,
                plate: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorization: user must be rider or admin
    if (session?.userId !== booking.userId && session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get latest location
    const latestLocation = await prisma.tripLocation.findFirst({
      where: { bookingId },
      orderBy: { timestamp: "desc" },
      take: 1,
    });

    return NextResponse.json({
      booking,
      currentLocation: latestLocation
        ? {
            lat: latestLocation.lat,
            lng: latestLocation.lng,
            heading: latestLocation.heading,
            speed: latestLocation.speed,
            timestamp: latestLocation.timestamp,
          }
        : null,
    });
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
