import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeDriverEarning } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ booking: null }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      driverId: session.driverId,
      status: "CONFIRMED",
      /* Exclude future reserved rides — a scheduled ride the chauffeur accepted
         but hasn't set off for yet lives in Reserved Rides, not the active flow.
         It becomes "active" once enRouteAt/startedAt is set, or once its
         scheduled time has arrived. */
      NOT: {
        AND: [
          { scheduledAt: { gt: new Date() } },
          { enRouteAt: null },
          { startedAt: null },
        ],
      },
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
