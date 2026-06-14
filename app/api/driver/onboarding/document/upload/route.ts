import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DocumentType } from "@prisma/client";

const VALID_TYPES: DocumentType[] = [
  "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT",
  "VEHICLE_REGISTRATION", "VEHICLE_INSURANCE", "VEHICLE_PHOTO",
  "PROFILE_PHOTO", "WORK_ELIGIBILITY", "BANKING_INFO", "OTHER",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: "file and type are required" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type as DocumentType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const fileUrl  = `data:${mimeType};base64,${base64}`;

  let onboarding = await prisma.driverOnboarding.findUnique({
    where: { driverId: session.driverId },
  });
  if (!onboarding) {
    onboarding = await prisma.driverOnboarding.create({
      data: { driverId: session.driverId },
    });
  }

  const existing = await prisma.onboardingDocument.findFirst({
    where: { onboardingId: onboarding.id, type: type as DocumentType },
  });

  const doc = existing
    ? await prisma.onboardingDocument.update({
        where: { id: existing.id },
        data:  { fileName: file.name, fileUrl, status: "PENDING", uploadedAt: new Date() },
      })
    : await prisma.onboardingDocument.create({
        data: {
          onboardingId: onboarding.id,
          type: type as DocumentType,
          fileName: file.name,
          fileUrl,
        },
      });

  return NextResponse.json({ success: true, document: { id: doc.id, fileName: doc.fileName } });
}
