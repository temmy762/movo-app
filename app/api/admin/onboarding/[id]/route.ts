import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { adminStatus, adminNote, activateDriver } = body;

  if (!adminStatus) {
    return NextResponse.json({ error: "adminStatus required" }, { status: 400 });
  }

  const onboarding = await prisma.driverOnboarding.update({
    where: { id: params.id },
    data: {
      adminStatus,
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    },
    include: { driver: { select: { id: true, firstName: true, lastName: true } } },
  }) as any;

  // When approved, activate the driver account and create vehicle for fleet partners
  if (adminStatus === "APPROVED" || activateDriver) {
    await prisma.driver.update({
      where: { id: onboarding.driverId },
      data:  { status: "ACTIVE" },
    });

    // If fleet partner, create the first vehicle
    if (onboarding.type === "FLEET" && onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
      try {
        await prisma.vehicle.create({
          data: {
            driverId: onboarding.driverId,
            make: onboarding.firstVehicleBrand,
            model: onboarding.firstVehicleModel,
            year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
            plate: onboarding.firstVehiclePlate,
            tier: onboarding.firstVehicleClass || "ECONOMY",
          },
        });
      } catch (err) {
        console.error("Failed to create vehicle for fleet partner:", err);
        // Don't fail the approval if vehicle creation fails
      }
    }
  }

  return NextResponse.json({ success: true, onboarding });
}
