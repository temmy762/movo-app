import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/driver/rental
 * The chauffeur's rental state: current open rental (REQUESTED awaiting admin
 * review, or APPROVED/active) plus recent history.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rentals, driver] = await Promise.all([
      prisma.vehicleRental.findMany({
        where: { driverId: session.driverId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, plan: true, amount: true, status: true,
          startDate: true, endDate: true, adminNote: true,
          returnCharge: true, returnChargeNote: true, createdAt: true,
          vehicle: { select: { id: true, make: true, model: true, year: true, color: true, tier: true } },
        },
      }),
      prisma.driver.findUnique({ where: { id: session.driverId }, select: { vehicle: { select: { id: true } } } }),
    ]);

    const active = rentals.find((r) => r.status === "REQUESTED" || r.status === "APPROVED") ?? null;
    const history = rentals.filter((r) => r !== active);

    return NextResponse.json({ active, history, hasOwnVehicle: !!driver?.vehicle });
  } catch (e) {
    console.error("[driver/rental]", e);
    return NextResponse.json({ error: "Failed to load rental" }, { status: 500 });
  }
}
