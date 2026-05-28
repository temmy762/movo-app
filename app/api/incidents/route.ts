import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { IncidentType } from "@prisma/client";

const VALID_TYPES: IncidentType[] = [
  "ACCIDENT", "UNSAFE_DRIVING", "HARASSMENT",
  "VEHICLE_ISSUE", "ROUTE_DEVIATION", "OTHER",
];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bookingId, type, description } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid incident type" }, { status: 400 });
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json({ error: "Description must be at least 10 characters" }, { status: 400 });
  }

  // Verify booking belongs to the reporter if provided
  if (bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const isOwner = session.userId === booking.userId || session.driverId === booking.driverId;
    if (!isOwner && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const reportedByRole = session.driverId ? "DRIVER" : "RIDER";

  const incident = await prisma.incidentReport.create({
    data: {
      reportedByRole,
      type,
      description: description.trim(),
      bookingId:  bookingId ?? null,
      userId:     session.userId  ?? null,
      driverId:   session.driverId ?? null,
    },
  });

  return NextResponse.json({ success: true, incidentId: incident.id }, { status: 201 });
}
