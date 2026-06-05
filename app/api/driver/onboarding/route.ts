import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onboarding = await prisma.driverOnboarding.findUnique({
    where:   { driverId: session.driverId },
    include: { documents: { orderBy: { uploadedAt: "asc" } } },
  });

  if (!onboarding) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, onboarding });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify driver exists before creating/updating onboarding
    const driver = await prisma.driver.findUnique({
      where: { id: session.driverId },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      type, currentStep, completedSteps,
      profilePhotoUrl, dob, licenseNumber,
      vehicleMake, vehicleModel, vehicleYear, vehiclePlate, vehicleTier, vehicleColor,
      bankAccountName, bankInstitution, bankAccountNumber, bankRoutingNumber,
      signature,
      gpsConsent, privacyPolicy, legalNotice, termsAccepted, contractSigned,
      submit,
    } = body;

    const now = new Date();

    const data: Record<string, unknown> = {};
    if (type            !== undefined) data.type            = type;
    if (currentStep     !== undefined) data.currentStep     = currentStep;
    if (completedSteps  !== undefined) data.completedSteps  = completedSteps;
    if (profilePhotoUrl !== undefined) data.profilePhotoUrl = profilePhotoUrl;
    if (dob             !== undefined) data.dob             = dob;
    if (licenseNumber   !== undefined) data.licenseNumber   = licenseNumber;
    if (vehicleMake     !== undefined) data.vehicleMake     = vehicleMake;
    if (vehicleModel    !== undefined) data.vehicleModel    = vehicleModel;
    if (vehicleYear     !== undefined) data.vehicleYear     = vehicleYear;
    if (vehiclePlate    !== undefined) data.vehiclePlate    = vehiclePlate;
    if (vehicleTier     !== undefined) data.vehicleTier     = vehicleTier;
    if (vehicleColor    !== undefined) data.vehicleColor    = vehicleColor;
    if (bankAccountName !== undefined) data.bankAccountName = bankAccountName;
    if (bankInstitution !== undefined) data.bankInstitution = bankInstitution;
    if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber;
    if (bankRoutingNumber !== undefined) data.bankRoutingNumber = bankRoutingNumber;
    if (signature       !== undefined) data.signature       = signature;
    if (gpsConsent)     data.gpsConsentAt     = now;
    if (privacyPolicy)  data.privacyPolicyAt  = now;
    if (legalNotice)    data.legalNoticeAt    = now;
    if (termsAccepted)  data.termsAcceptedAt  = now;
    if (contractSigned) data.contractSignedAt = now;
    if (submit)         data.submittedAt      = now;

    const onboarding = await prisma.driverOnboarding.upsert({
      where:  { driverId: session.driverId },
      create: { driverId: session.driverId, ...data },
      update: data,
    });

    // Also update driver's onboardingType if provided
    if (type) {
      await prisma.driver.update({
        where: { id: session.driverId },
        data:  { onboardingType: type },
      });
    }

    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    console.error("Onboarding PATCH error:", error);
    if (error instanceof Error && error.message.includes("ForeignKeyConstraintViolation")) {
      return NextResponse.json({ error: "Driver session is invalid. Please log in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
  }
}
