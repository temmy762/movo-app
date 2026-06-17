import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";

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

      /* Notify driver of rejection */
      if (onboarding.driver.email) {
        sendNotification({
          eventType: "CHAUFFEUR_ONBOARDING_REJECTED",
          recipient: { type: "driver", id: onboarding.driver.id, email: onboarding.driver.email, firstName: onboarding.driver.firstName },
          data: { adminNote: adminNote ?? "Your application did not meet our requirements at this time." },
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, message: "Onboarding rejected" });
    }

    // APPROVE onboarding
    const driver = onboarding.driver;

    // Set driver status to ACTIVE
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: "ACTIVE" },
    });

    // Check if driver already has a vehicle (idempotent re-approval)
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { driverId: driver.id },
    });

    if (!existingVehicle) {
      if (onboarding.type === "INDIVIDUAL") {
        // Individual chauffeur — create their vehicle from onboarding data
        if (onboarding.vehicleMake && onboarding.vehicleModel && onboarding.vehiclePlate) {
          await prisma.vehicle.create({
            data: {
              driverId: driver.id,
              make: onboarding.vehicleMake,
              model: onboarding.vehicleModel,
              year: parseInt(onboarding.vehicleYear || new Date().getFullYear().toString()),
              plate: onboarding.vehiclePlate,
              tier: onboarding.vehicleTier || "classic",
            },
          });
          console.log(`[Admin] Vehicle created for individual chauffeur: ${driver.id}`);
        } else {
          console.warn(`[Admin] Individual chauffeur ${driver.id} approved but missing vehicle info in onboarding`);
        }
      } else if (onboarding.type === "FLEET") {
        // Fleet partner — create their first vehicle from onboarding data
        if (onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
          await prisma.vehicle.create({
            data: {
              driverId: driver.id,
              make: onboarding.firstVehicleBrand,
              model: onboarding.firstVehicleModel,
              year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
              plate: onboarding.firstVehiclePlate,
              tier: onboarding.firstVehicleClass || "classic",
            },
          });
          console.log(`[Admin] Vehicle created for fleet partner: ${driver.id}`);
        }
      }
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

    /* Notify driver of approval */
    if (driver.email) {
      sendNotification({
        eventType: "CHAUFFEUR_ONBOARDING_APPROVED",
        recipient: { type: "driver", id: driver.id, email: driver.email, firstName: driver.firstName },
        data: {},
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "Onboarding approved. Driver activated.", driverId: driver.id });
  } catch (error) {
    console.error("Onboarding approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process onboarding" },
      { status: 500 }
    );
  }
}
