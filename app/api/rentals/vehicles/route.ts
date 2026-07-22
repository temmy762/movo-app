import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/rentals/vehicles
 * Rental fleet browsing for approved chauffeurs. Launch scope is
 * chauffeur-only; when public customer rentals arrive, add a user-session
 * branch here (the data model already carries renterType).
 *
 * Photos are NEVER inlined (multi-MB base64) — the response carries
 * photoCount and the client streams /api/rentals/vehicles/[id]/photo?i=N.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [vehicles, openRentals] = await Promise.all([
      prisma.rentalVehicle.findMany({
        where: { status: { in: ["AVAILABLE", "RENTED"] } },
        select: {
          id: true, make: true, model: true, year: true, color: true, tier: true,
          dailyRate: true, weeklyRate: true, monthlyRate: true, status: true,
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.vehicleRental.findMany({
        where: { status: { in: ["REQUESTED", "APPROVED"] } },
        select: { vehicleId: true, driverId: true, status: true },
      }),
    ]);

    const photoCounts = await prisma.rentalVehicle.findMany({
      where: { id: { in: vehicles.map((v) => v.id) } },
      select: { id: true, photos: true },
    }).then((rows) => new Map(rows.map((r) => [r.id, r.photos.length])));

    const openByVehicle = new Map(openRentals.map((r) => [r.vehicleId, r]));

    return NextResponse.json(
      vehicles.map((v) => {
        const open = openByVehicle.get(v.id);
        return {
          ...v,
          photoCount: photoCounts.get(v.id) ?? 0,
          /* AVAILABLE but with a paid request pending admin review */
          requested: v.status === "AVAILABLE" && open?.status === "REQUESTED",
          /* This chauffeur's own open rental on this vehicle */
          mine: open?.driverId === session.driverId,
        };
      }),
    );
  } catch (e) {
    console.error("[rentals/vehicles]", e);
    return NextResponse.json({ error: "Failed to load rental vehicles" }, { status: 500 });
  }
}
