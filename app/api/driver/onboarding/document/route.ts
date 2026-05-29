import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DocumentType } from "@prisma/client";

const VALID_TYPES: DocumentType[] = [
  "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT",
  "VEHICLE_REGISTRATION", "VEHICLE_INSURANCE", "VEHICLE_PHOTO",
  "PROFILE_PHOTO", "WORK_ELIGIBILITY", "BANKING_INFO", "OTHER",
];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, fileName } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName required" }, { status: 400 });
  }

  // Ensure onboarding record exists
  let onboarding = await prisma.driverOnboarding.findUnique({
    where: { driverId: session.driverId },
  });
  if (!onboarding) {
    onboarding = await prisma.driverOnboarding.create({
      data: { driverId: session.driverId },
    });
  }

  // Upsert: one record per type (replace if re-uploaded)
  const existing = await prisma.onboardingDocument.findFirst({
    where: { onboardingId: onboarding.id, type },
  });

  let doc;
  if (existing) {
    doc = await prisma.onboardingDocument.update({
      where: { id: existing.id },
      data:  { fileName, status: "PENDING", uploadedAt: new Date() },
    });
  } else {
    doc = await prisma.onboardingDocument.create({
      data: { onboardingId: onboarding.id, type, fileName },
    });
  }

  return NextResponse.json({ success: true, document: doc }, { status: 201 });
}
