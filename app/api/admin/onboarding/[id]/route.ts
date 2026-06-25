import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";
import { normalizeTier } from "@/lib/normalizeTier";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const record = await prisma.driverOnboarding.findUnique({
    where: { id },
    include: {
      driver:    { select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, city: true, status: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
}

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
    include: { driver: { select: { id: true, firstName: true, lastName: true, email: true } } },
  }) as any;

  // When approved, activate the driver account and create vehicle for fleet partners
  if (adminStatus === "APPROVED" || activateDriver) {
    try {
      // Fetch onboarding with documents to get vehicle photo
      const onboardingWithDocs = await prisma.driverOnboarding.findUnique({
        where: { id },
        include: { documents: true },
      });

      // Get vehicle photo URL from documents
      const vehiclePhotoDoc = onboardingWithDocs?.documents?.find(
        (doc) => doc.type === "VEHICLE_PHOTO"
      );

      // Use transaction to ensure both operations succeed or both fail
      await prisma.$transaction(async (tx) => {
        // Update driver
        await tx.driver.update({
          where: { id: onboarding.driverId },
          data:  { status: "ACTIVE" },
        });

        // Create vehicle for both INDIVIDUAL and FLEET partners
        if (onboarding.type === "FLEET" && onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
          // Fleet: Use first vehicle info
          await tx.vehicle.create({
            data: {
              driverId: onboarding.driverId,
              make: onboarding.firstVehicleBrand,
              model: onboarding.firstVehicleModel,
              year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
              plate: onboarding.firstVehiclePlate,
              tier: normalizeTier(onboarding.firstVehicleClass),
              photoUrl: (vehiclePhotoDoc as any)?.fileUrl || null,
            },
          });
        } else if (onboarding.type === "INDIVIDUAL" && onboarding.vehicleMake && onboarding.vehicleModel && onboarding.vehiclePlate) {
          // Individual: Use vehicle info from onboarding
          await tx.vehicle.create({
            data: {
              driverId: onboarding.driverId,
              make: onboarding.vehicleMake,
              model: onboarding.vehicleModel,
              year: parseInt(onboarding.vehicleYear || new Date().getFullYear().toString()),
              plate: onboarding.vehiclePlate,
              tier: normalizeTier(onboarding.vehicleTier),
              photoUrl: (vehiclePhotoDoc as any)?.fileUrl || null,
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

  // Send approval/rejection notification (outside approval block so rejection fires too)
  if (adminStatus === "APPROVED") {
    try {
      await sendNotification({
        eventType: "CHAUFFEUR_ONBOARDING_APPROVED",
        recipient: {
          type: "driver",
          id: onboarding.driverId,
          email: onboarding.driver.email,
          firstName: onboarding.driver.firstName,
          lastName: onboarding.driver.lastName,
        },
        data: {
          driverName: onboarding.driver.firstName,
          onboardingType: onboarding.type,
        },
      });
    } catch (notifErr) {
      console.error("Failed to send approval notification:", notifErr);
    }
  } else if (adminStatus === "REJECTED") {
    try {
      await sendNotification({
        eventType: "CHAUFFEUR_ONBOARDING_REJECTED",
        recipient: {
          type: "driver",
          id: onboarding.driverId,
          email: onboarding.driver.email,
          firstName: onboarding.driver.firstName,
          lastName: onboarding.driver.lastName,
        },
        data: {
          driverName: onboarding.driver.firstName,
          reason: adminNote || "Your application did not meet our requirements",
        },
      });
    } catch (notifErr) {
      console.error("Failed to send rejection notification:", notifErr);
    }
  }

  return NextResponse.json({ success: true, onboarding });
}
