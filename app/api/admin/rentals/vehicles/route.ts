import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";

/**
 * Admin management of the Movo rental fleet.
 * GET  — list every rental vehicle (photos NEVER inlined — see photoCount).
 * POST — add a new rental vehicle.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const vehicles = await prisma.rentalVehicle.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, make: true, model: true, year: true, plate: true, color: true, tier: true,
      dailyRate: true, weeklyRate: true, monthlyRate: true, status: true, notes: true,
      photos: true, createdAt: true,
      rentals: {
        where: { status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true, status: true, driver: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json(
    vehicles.map((v) => ({
      ...v,
      photoCount: v.photos.length,
      photos: undefined,
      openRental: v.rentals[0] ?? null,
      rentals: undefined,
    })),
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { make, model, year, plate, color, tier, dailyRate, weeklyRate, monthlyRate, notes, photos } = body;

    if (!make || !model || !year || !plate) {
      return NextResponse.json({ error: "make, model, year, and plate are required" }, { status: 400 });
    }

    const vehicle = await prisma.rentalVehicle.create({
      data: {
        make, model, year: parseInt(year, 10), plate,
        color: color || null,
        tier: tier || "classic",
        dailyRate:   dailyRate   != null ? parseFloat(dailyRate)   : 89,
        weeklyRate:  weeklyRate  != null ? parseFloat(weeklyRate)  : 575,
        monthlyRate: monthlyRate != null ? parseFloat(monthlyRate) : 2150,
        notes: notes || null,
        photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
      },
    });

    logAudit({
      action: "rental_vehicle.created", entityType: "RentalVehicle", entityId: vehicle.id,
      actorType: "ADMIN", actorId: session.userId ?? null,
      detail: { make, model, year, plate },
    }).catch(() => {});

    return NextResponse.json({ ...vehicle, photoCount: vehicle.photos.length, photos: undefined });
  } catch (e) {
    console.error("[admin/rentals/vehicles POST]", e);
    return NextResponse.json({ error: "Failed to create rental vehicle" }, { status: 500 });
  }
}
