import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchDriverLocation } from "@/lib/socket/dispatcher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch booking to verify access
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id:       true,
      status:   true,
      driverId: true,
      userId:   true,
      startedAt: true,
      driver: {
        select: { lat: true, lng: true, isOnline: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Access: rider who owns it, the assigned driver, or admin
  const isRider  = session.userId   === booking.userId;
  const isDriver = session.driverId === booking.driverId;
  const isAdmin  = session.role     === "ADMIN";
  if (!isRider && !isDriver && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get the latest TripLocation snapshot
  const latest = await prisma.tripLocation.findFirst({
    where:   { bookingId },
    orderBy: { timestamp: "desc" },
    select:  { lat: true, lng: true, heading: true, speed: true, timestamp: true },
  });

  // Fallback to driver's last known position if no snapshot yet
  const position = latest ?? (booking.driver
    ? { lat: booking.driver.lat, lng: booking.driver.lng, heading: null, speed: null, timestamp: null }
    : null);

  return NextResponse.json({
    bookingId,
    status:    booking.status,
    startedAt: booking.startedAt,
    position,
    driverOnline: booking.driver?.isOnline ?? false,
  });
}

/**
 * POST — driver pushes their current GPS position.
 * Saves a TripLocation snapshot and immediately broadcasts via Socket.IO
 * so the rider's tracking page updates without any polling.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lat, lng, heading, speed } = await req.json();

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  /* Persist snapshot + update driver's last-known position */
  await Promise.all([
    prisma.tripLocation.create({
      data: { bookingId, lat, lng, heading: heading ?? null, speed: speed ?? null },
    }),
    prisma.driver.update({
      where: { id: session.driverId },
      data:  { lat, lng },
    }),
  ]);

  /* Broadcast to the booking room — rider receives it instantly */
  dispatchDriverLocation({ bookingId, lat, lng, heading: heading ?? undefined });

  return NextResponse.json({ ok: true });
}
