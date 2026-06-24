import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Resend } from "resend";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    // Only drivers can submit onboarding
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the driver still exists (protect against stale sessions)
    const driverRecord = await prisma.driver.findUnique({
      where: { id: session.driverId },
    });

    if (!driverRecord) {
      return NextResponse.json(
        { error: "Driver account not found. Please log out and log in again." },
        { status: 404 }
      );
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
          from: "Movo Privé <noreply@movoprive.com>",
          to: driver.email,
          subject: "Onboarding Application Submitted - Movo Privé",
          reply_to: "support@movoprive.com",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #131936, #C6BFB2); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Movo Privé</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #131936; margin-top: 0;">Thank you for submitting your onboarding application!</h2>
                  <p>Dear ${driver.firstName || "Driver"},</p>
                  <p>We have received your <strong>${type === "FLEET" ? "fleet partner" : "chauffeur"}</strong> onboarding application.</p>
                  <div style="background: white; padding: 15px; border-left: 4px solid #C6BFB2; margin: 20px 0;">
                    <p style="margin: 0;"><strong>What happens next:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Our team will review your information and documents</li>
                      <li>We'll verify your details and registration</li>
                      <li>You'll receive an email notification with the decision</li>
                      <li>This typically takes 1-3 business days</li>
                    </ul>
                  </div>
                  <p>If you have any questions, please contact our support team at <a href="mailto:support@movoprive.com" style="color: #131936; text-decoration: none;"><strong>support@movoprive.com</strong></a></p>
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                  <p style="color: #666; font-size: 12px; margin: 0;">Best regards,<br/><strong>The Movo Privé Team</strong></p>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send onboarding confirmation email:", emailError);
      }
    }

    /* Notify all admins — email + in-app */
    const eventType = type === "FLEET" ? "ADMIN_NEW_FLEET_APPLICATION" : "ADMIN_NEW_DRIVER_APPLICATION";
    notifyAdmins(
      eventType,
      {
        driverId:      driver.id,
        firstName:     driver.firstName,
        lastName:      driver.lastName,
        email:         driver.email,
        phone:         driver.phone ?? undefined,
        city:          driver.city,
        onboardingType: type === "FLEET" ? "Fleet Partner" : "Individual Chauffeur",
        submittedAt:   new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      },
      ["EMAIL", "IN_APP"]
    ).catch((e) => console.error("[onboarding] admin notify failed:", e));

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
