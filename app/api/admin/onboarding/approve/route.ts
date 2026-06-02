import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);

    // Only admins can approve onboarding
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { onboardingId, approve, adminNote } = await req.json();

    if (!onboardingId) {
      return NextResponse.json({ error: "onboardingId required" }, { status: 400 });
    }

    // Fetch onboarding record
    const onboarding = await prisma.driverOnboarding.findUnique({
      where: { id: onboardingId },
      include: { driver: true },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    if (!approve) {
      // REJECT onboarding
      await prisma.driverOnboarding.update({
        where: { id: onboardingId },
        data: {
          adminStatus: "REJECTED",
          adminNote,
          reviewedAt: new Date(),
          reviewedBy: session.userId || "admin",
        },
      });

      console.log(`[Admin] Onboarding rejected: ${onboardingId}`);

      return NextResponse.json({
        success: true,
        message: "Onboarding rejected",
      });
    }

    // APPROVE onboarding
    const driver = onboarding.driver;

    // Set driver status to ACTIVE
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: "ACTIVE" },
    });

    // If fleet partner, create first vehicle and first chauffeur
    if (onboarding.type === "FLEET") {
      // Create first vehicle
      if (onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
        await prisma.vehicle.create({
          data: {
            driverId: driver.id,
            make: onboarding.firstVehicleBrand,
            model: onboarding.firstVehicleModel,
            year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
            plate: onboarding.firstVehiclePlate,
            tier: onboarding.firstVehicleClass || "ECONOMY",
          },
        });

        console.log(`[Admin] Vehicle created for fleet partner: ${driver.id}`);
      }

      // Note: First chauffeur creation would require additional logic
      // For now, we just store the info in onboarding for reference
      // Admin can manually create additional drivers if needed
    }

    // Update onboarding status
    await prisma.driverOnboarding.update({
      where: { id: onboardingId },
      data: {
        adminStatus: "APPROVED",
        adminNote,
        reviewedAt: new Date(),
        reviewedBy: session.userId || "admin",
      },
    });

    console.log(`[Admin] Onboarding approved: ${onboardingId} (driver: ${driver.id})`);

    return NextResponse.json({
      success: true,
      message: "Onboarding approved. Driver activated.",
      driverId: driver.id,
    });
  } catch (error) {
    console.error("Onboarding approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process onboarding" },
      { status: 500 }
    );
  }
}
