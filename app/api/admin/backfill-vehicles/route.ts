import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * POST /api/admin/backfill-vehicles
 * One-time fix: creates Vehicle records for all ACTIVE drivers who were approved
 * but never had a Vehicle row created (bug in old approval route).
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Find all ACTIVE drivers with no vehicle but with onboarding vehicle data
  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      vehicle: null,
      onboarding: { adminStatus: "APPROVED" },
    },
    include: { onboarding: true },
  });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const driver of drivers) {
    const ob = driver.onboarding;
    if (!ob) { skipped.push(driver.id); continue; }

    let make: string | null = null;
    let model: string | null = null;
    let plate: string | null = null;
    let year = new Date().getFullYear();
    let tier = "classic";

    if (ob.type === "INDIVIDUAL") {
      make  = ob.vehicleMake;
      model = ob.vehicleModel;
      plate = ob.vehiclePlate;
      year  = parseInt(ob.vehicleYear  || String(year));
      tier  = ob.vehicleTier || "classic";
    } else if (ob.type === "FLEET") {
      make  = ob.firstVehicleBrand;
      model = ob.firstVehicleModel;
      plate = ob.firstVehiclePlate;
      year  = parseInt(ob.firstVehicleYear || String(year));
      tier  = ob.firstVehicleClass || "classic";
    }

    if (!make || !model || !plate) {
      skipped.push(driver.id);
      continue;
    }

    await prisma.vehicle.create({
      data: { driverId: driver.id, make, model, year, plate, tier },
    });
    created.push(driver.id);
  }

  return NextResponse.json({
    message: `Backfill complete. Created ${created.length} vehicle(s), skipped ${skipped.length}.`,
    created,
    skipped,
  });
}
