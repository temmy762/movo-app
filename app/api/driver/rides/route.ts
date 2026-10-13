import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeDriverEarning, safeRideEarningFor } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = new URL(req.url).searchParams.get("tab") ?? "past";

  const statusFilter: { in: ("PENDING" | "CONFIRMED" | "COMPLETED")[] } =
    tab === "upcoming" ? { in: ["PENDING", "CONFIRMED"] } : { in: ["COMPLETED"] };

  const [rides, driver] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: statusFilter,
        /* Standard rides (booking.driverId) AND Safe Rides, whose chauffeur is
           on a care assignment — those never showed up here before */
        OR: [
          { driverId: session.driverId },
          { careAssignments: { some: {
            driverId: session.driverId,
            status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] },
          } } },
        ],
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientName: true,
        pickup: true,
        dropoff: true,
        carTier: true,
        carName: true,
        fare: true,
        total: true,
        status: true,
        paymentStatus: true,
        scheduledAt: true,
        createdAt: true,
        bookingNumber: true,
        bookingType: true,
        enRouteAt: true,
        chauffeurPayout: true,
        waitingFee: true,
        pricingSnapshot: true,
        careAssignments: {
          where: { driverId: session.driverId, status: { notIn: ["PENDING", "CANCELLED", "SEARCHING"] } },
          select: { role: true },
          take: 1,
        },
      },
    }),
    prisma.driver.findUnique({
      where: { id: session.driverId },
      select: { fleetDriverSplit: true },
    }),
  ]);

  /* Attach the chauffeur's payout per ride so the list shows earnings, not the
     customer fare. */
  const enriched = await Promise.all(
    rides.map(async ({ careAssignments, chauffeurPayout, waitingFee, pricingSnapshot, ...r }) => ({
      ...r,
      careRole: careAssignments[0]?.role ?? null,
      earning: r.bookingType === "CARE"
        ? await safeRideEarningFor({ fare: r.fare, chauffeurPayout, waitingFee, pricingSnapshot }, careAssignments[0]?.role ?? "PRIMARY")
        : await computeDriverEarning(r.fare, r.carTier, driver),
    })),
  );

  /* Always fresh — a just-completed ride must show up immediately */
  return NextResponse.json(enriched, { headers: { "Cache-Control": "no-store" } });
}
