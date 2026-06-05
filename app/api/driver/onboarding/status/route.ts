import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const onboarding = await prisma.driverOnboarding.findFirst({
      where: { driverId: session.driverId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        adminStatus: true,
        adminNote: true,
        type: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    if (!onboarding) {
      return NextResponse.json({ adminStatus: "NOT_SUBMITTED" });
    }

    return NextResponse.json({
      id: onboarding.id,
      adminStatus: onboarding.adminStatus,
      adminNote: onboarding.adminNote,
      type: onboarding.type,
      submittedAt: onboarding.submittedAt,
      reviewedAt: onboarding.reviewedAt,
    });
  } catch (error) {
    console.error("Onboarding status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}
