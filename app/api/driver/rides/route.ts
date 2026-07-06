import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeDriverEarning } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = new URL(req.url).searchParams.get("tab") ?? "past";

  const statusFilter =
    tab === "upcoming"
      ? { in: ["PENDING", "CONFIRMED"] as const }
      : { equals: "COMPLETED" as const };

  const [rides, driver] = await Promise.all([
    prisma.booking.findMany({
      where: {
        driverId: session.driverId,
        status: statusFilter,
      },
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
    rides.map(async (r) => ({
      ...r,
      earning: await computeDriverEarning(r.fare, r.carTier, driver),
    })),
  );

  return NextResponse.json(enriched);
}
