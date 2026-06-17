import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { IncidentType } from "@prisma/client";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

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

  /* Notify admin */
  const reporterName = session.driverId
    ? (await prisma.driver.findUnique({ where: { id: session.driverId }, select: { firstName: true, lastName: true, email: true } }))
    : (await prisma.user.findUnique({ where: { id: session.userId! }, select: { firstName: true, lastName: true, email: true } }));

  const incidentData = {
    incidentId:    incident.id,
    reportedBy:    reporterName ? `${reporterName.firstName} ${reporterName.lastName}` : "Unknown",
    reportedByRole: reportedByRole,
    type:          type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
    description:   description.trim().slice(0, 100) + (description.length > 100 ? "..." : ""),
    bookingId:     bookingId ?? undefined,
    createdAt:     new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" }),
  };

  notifyAdmins("ADMIN_NEW_INCIDENT_REPORT", incidentData, ["EMAIL", "IN_APP"]).catch(() => {});

  /* Notify submitter */
  if (reporterName?.email) {
    const eventType = session.driverId ? "CHAUFFEUR_BOOKING_ASSIGNED" : "RIDER_INCIDENT_SUBMITTED";
    if (!session.driverId) {
      sendNotification({
        eventType: "RIDER_INCIDENT_SUBMITTED",
        recipient: { type: "user", id: session.userId!, email: reporterName.email, firstName: reporterName.firstName },
        data: { incidentId: incident.id, type: incidentData.type, submittedAt: incidentData.submittedAt },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, incidentId: incident.id }, { status: 201 });
}
