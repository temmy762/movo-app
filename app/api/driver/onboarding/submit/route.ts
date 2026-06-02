import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    // Only drivers can submit onboarding
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate required fields based on onboarding type
    const {
      type, // "INDIVIDUAL" or "FLEET"
      
      // Fleet partner fields
      companyName,
      legalForm,
      country,
      city,
      street,
      postalCode,
      taxId,
      vatId,
      registrationNumber,
      fleetSize,
      vehicleDescriptions,
      
      // First vehicle info
      firstVehicleYear,
      firstVehicleBrand,
      firstVehicleModel,
      firstVehicleClass,
      firstVehicleColor,
      firstVehiclePlate,
      firstVehicleVin,
      
      // First chauffeur info
      firstChauffeurFirstName,
      firstChauffeurLastName,
      firstChauffeurEmail,
      firstChauffeurPhone,
    } = body;

    // Validate fleet partner required fields
    if (type === "FLEET") {
      const required = [
        companyName,
        legalForm,
        country,
        city,
        street,
        postalCode,
        taxId,
        vatId,
        registrationNumber,
        fleetSize,
        vehicleDescriptions,
        firstVehicleYear,
        firstVehicleBrand,
        firstVehicleModel,
        firstVehicleClass,
        firstVehicleColor,
        firstVehiclePlate,
        firstVehicleVin,
        firstChauffeurFirstName,
        firstChauffeurLastName,
        firstChauffeurEmail,
        firstChauffeurPhone,
      ];

      const missing = required.filter((field) => !field);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "Missing required fields for fleet onboarding" },
          { status: 400 }
        );
      }
    }

    // Check if driver already has an onboarding record
    const existingOnboarding = await prisma.driverOnboarding.findUnique({
      where: { driverId: session.driverId },
    });

    if (existingOnboarding && existingOnboarding.submittedAt) {
      return NextResponse.json(
        { error: "Onboarding already submitted. Awaiting admin review." },
        { status: 400 }
      );
    }

    // Update or create onboarding record
    const onboarding = await prisma.driverOnboarding.upsert({
      where: { driverId: session.driverId },
      create: {
        driverId: session.driverId,
        type: type || "INDIVIDUAL",
        
        // Fleet fields
        companyName,
        legalForm,
        country,
        city,
        street,
        postalCode,
        taxId,
        vatId,
        registrationNumber,
        fleetSize,
        vehicleDescriptions,
        
        // First vehicle
        firstVehicleYear,
        firstVehicleBrand,
        firstVehicleModel,
        firstVehicleClass,
        firstVehicleColor,
        firstVehiclePlate,
        firstVehicleVin,
        
        // First chauffeur
        firstChauffeurFirstName,
        firstChauffeurLastName,
        firstChauffeurEmail,
        firstChauffeurPhone,
        
        submittedAt: new Date(),
        adminStatus: "PENDING",
      },
      update: {
        type: type || "INDIVIDUAL",
        
        // Fleet fields
        companyName,
        legalForm,
        country,
        city,
        street,
        postalCode,
        taxId,
        vatId,
        registrationNumber,
        fleetSize,
        vehicleDescriptions,
        
        // First vehicle
        firstVehicleYear,
        firstVehicleBrand,
        firstVehicleModel,
        firstVehicleClass,
        firstVehicleColor,
        firstVehiclePlate,
        firstVehicleVin,
        
        // First chauffeur
        firstChauffeurFirstName,
        firstChauffeurLastName,
        firstChauffeurEmail,
        firstChauffeurPhone,
        
        submittedAt: new Date(),
        adminStatus: "PENDING",
      },
    });

    // Update driver onboarding type
    await prisma.driver.update({
      where: { id: session.driverId },
      data: { onboardingType: type || "INDIVIDUAL" },
    });

    console.log(`[Onboarding] Fleet partner submitted: ${onboarding.id} (driver: ${session.driverId})`);

    return NextResponse.json({
      success: true,
      onboardingId: onboarding.id,
      message: "Onboarding submitted successfully. Awaiting admin review.",
    });
  } catch (error) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit onboarding" },
      { status: 500 }
    );
  }
}
