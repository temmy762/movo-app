import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      user:   { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      driver: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      booking: {
        select: {
          id: true, clientName: true, pickup: true, dropoff: true,
          carName: true, carTier: true, fare: true, total: true,
          status: true, paymentStatus: true,
          startedAt: true, completedAt: true, createdAt: true,
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // Include location point count for trip context
  let locationCount = 0;
  if (incident.bookingId) {
    locationCount = await prisma.tripLocation.count({ where: { bookingId: incident.bookingId } });
  }

  return NextResponse.json({ ...incident, locationCount });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { reviewStatus, reviewNote } = body;

  const validStatuses = ["PENDING", "AI_REVIEWED", "MANUALLY_REVIEWED", "RESOLVED", "DISMISSED"];
  if (reviewStatus && !validStatuses.includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid reviewStatus" }, { status: 400 });
  }

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      ...(reviewStatus ? { reviewStatus, reviewedAt: new Date() } : {}),
      ...(reviewNote !== undefined ? { reviewNote } : {}),
    },
  });

  return NextResponse.json({ success: true, incident: updated });
}
