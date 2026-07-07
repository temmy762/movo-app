import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeDriverEarning } from "@/lib/earnings";

/**
 * GET /api/driver/reserved
 * The chauffeur's accepted, upcoming SCHEDULED rides (Reserved Rides) — those
 * they've committed to but haven't set off for yet.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rides = await prisma.booking.findMany({
    where: {
      driverId: session.driverId,
      status: "CONFIRMED",
      scheduledAt: { not: null },
      enRouteAt: null,
      startedAt: null,
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      clientName: true,
      pickup: true,
      dropoff: true,
      carTier: true,
      carName: true,
      fare: true,
      total: true,
      scheduledAt: true,
      paymentStatus: true,
    },
  });

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { fleetDriverSplit: true },
  });

  const enriched = await Promise.all(
    rides.map(async (r) => ({
      ...r,
      earning: await computeDriverEarning(r.fare, r.carTier, driver),
    })),
  );

  return NextResponse.json(enriched);
}
