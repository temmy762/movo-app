import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { adminStatus, adminNote, activateDriver } = body;

  if (!adminStatus) {
    return NextResponse.json({ error: "adminStatus required" }, { status: 400 });
  }

  const onboarding = await prisma.driverOnboarding.update({
    where: { id: params.id },
    data: {
      adminStatus,
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    },
    include: { driver: { select: { id: true, firstName: true, lastName: true } } },
  });

  // When approved, activate the driver account
  if (adminStatus === "APPROVED" || activateDriver) {
    await prisma.driver.update({
      where: { id: onboarding.driverId },
      data:  { status: "ACTIVE" },
    });
  }

  return NextResponse.json({ success: true, onboarding });
}
