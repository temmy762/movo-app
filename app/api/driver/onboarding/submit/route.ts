import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Resend } from "resend";

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
    const driver = await prisma.driver.update({
      where: { id: session.driverId },
      data: { onboardingType: type || "INDIVIDUAL" },
    });

    // Send confirmation email
    if (driver.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "noreply@movoprive.com",
          to: driver.email,
          subject: "Onboarding Application Submitted - Movo Privé",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for submitting your onboarding application!</h2>
              <p>Dear ${driver.firstName || "Driver"},</p>
              <p>We have received your ${type === "FLEET" ? "fleet partner" : "chauffeur"} onboarding application.</p>
              <p>Our team will review your information and documents. You'll receive an email notification once your application has been reviewed. This typically takes 1-3 business days.</p>
              <p>If you have any questions, please contact our support team at <strong>support@movoprive.com</strong></p>
              <p>Best regards,<br/>The Movo Privé Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send onboarding confirmation email:", emailError);
      }
    }

    console.log(`[Onboarding] ${type === "FLEET" ? "Fleet partner" : "Chauffeur"} submitted: ${onboarding.id} (driver: ${session.driverId})`);

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
