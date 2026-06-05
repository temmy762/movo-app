import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CRITICAL: Authorization check
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { adminStatus, adminNote, activateDriver } = body;

  if (!adminStatus) {
    return NextResponse.json({ error: "adminStatus required" }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "Onboarding ID is required" }, { status: 400 });
  }

  // Check if already approved (prevent double approval)
  const existingOnboarding = await prisma.driverOnboarding.findUnique({
    where: { id },
  });

  if (existingOnboarding?.adminStatus === "APPROVED") {
    return NextResponse.json(
      { error: "Application already approved" },
      { status: 400 }
    );
  }

  const onboarding = await prisma.driverOnboarding.update({
    where: { id },
    data: {
      adminStatus,
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    },
    include: { driver: { select: { id: true, firstName: true, lastName: true } } },
  }) as any;

  // When approved, activate the driver account and create vehicle for fleet partners
  if (adminStatus === "APPROVED" || activateDriver) {
    try {
      // Use transaction to ensure both operations succeed or both fail
      await prisma.$transaction(async (tx) => {
        // Update driver
        await tx.driver.update({
          where: { id: onboarding.driverId },
          data:  { status: "ACTIVE" },
        });

        // Create vehicle if fleet partner
        if (onboarding.type === "FLEET" && onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
          await tx.vehicle.create({
            data: {
              driverId: onboarding.driverId,
              make: onboarding.firstVehicleBrand,
              model: onboarding.firstVehicleModel,
              year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
              plate: onboarding.firstVehiclePlate,
              tier: onboarding.firstVehicleClass || "ECONOMY",
            },
          });
        }
      });
    } catch (err) {
      console.error("Approval transaction failed:", err);
      return NextResponse.json(
        { error: "Failed to complete approval. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, onboarding });
}
