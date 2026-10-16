import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeDriverEarning } from "@/lib/earnings";

const RESERVATION_LEAD_MS = 25 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ booking: null }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      driverId: session.driverId,
      status: "CONFIRMED",
      /* Exclude reservations for later — accepted, not set off for, and more
         than 25 min away (the same rule the accept screen uses to send a ride
         to Reserved Rides). A ride accepted closer to pickup is in the active
         flow and must come back after leaving the screen (e.g. after chat). */
      /* Written as a positive OR on purpose: the old NOT(scheduledAt > … AND …)
         evaluated to NULL for immediate rides (scheduledAt is null) and SQL
         drops NULL rows — so EVERY immediate ride vanished from the
         chauffeur's screen after a refresh, chat or "Go to Ride". */
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date(Date.now() + RESERVATION_LEAD_MS) } },
        { enRouteAt: { not: null } },
        { arrivedAt: { not: null } },
        { startedAt: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientName: true,
      pickup: true,
      dropoff: true,
      carTier: true,
      carName: true,
      total: true,
      fare: true,
      paymentStatus: true,
      status: true,
      startedAt: true,
      scheduledAt: true,
      /* So a page refresh restores the exact step (arrived → waiting clock) */
      arrivedAt: true,
      enRouteAt: true,
      bookingNumber: true,
      /* Rider contact + pickup details for the chauffeur */
      riderPhone: true,
      passengers: true,
      pickupInstructions: true,
      stops: true,
      user: { select: { phone: true } },
    },
  });

  if (!booking) return NextResponse.json({ booking: null });

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { fleetDriverSplit: true },
  });
  const earning = await computeDriverEarning(booking.fare, booking.carTier, driver);

  return NextResponse.json({ booking: { ...booking, earning } });
}
