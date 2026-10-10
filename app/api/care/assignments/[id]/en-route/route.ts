/**
 * PATCH /api/care/assignments/[id]/en-route
 *
 * Safe Ride reservation: the PRIMARY chauffeur taps "Heading to pickup". Until
 * now the customer has only seen their reservation (date/time + booking
 * details); from here they see "Chauffeur on the way". Mirrors the
 * standard-ride /api/bookings/[id]/en-route.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";
import { dispatchBookingStatus } from "@/lib/socket/dispatcher";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignment = await prisma.careAssignment.findUnique({
      where: { id },
      include: {
        booking: { select: { id: true, userId: true, pickup: true, dropoff: true, carName: true, status: true, enRouteAt: true } },
        driver:  { select: { firstName: true, lastName: true } },
      },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    if (assignment.driverId !== session.driverId || assignment.role !== "PRIMARY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (assignment.status !== "ACCEPTED") {
      return NextResponse.json({ error: "This Safe Ride isn't waiting for you to set off" }, { status: 409 });
    }
    if (assignment.booking.enRouteAt) {
      return NextResponse.json({ ok: true, enRouteAt: assignment.booking.enRouteAt });
    }

    const updated = await prisma.booking.update({
      where: { id: assignment.booking.id },
      data:  { enRouteAt: new Date() },
    });

    const userId = assignment.booking.userId;
    if (userId) {
      const rider = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, phone: true } });
      if (rider?.email) {
        const driverName = assignment.driver ? `${assignment.driver.firstName} ${assignment.driver.lastName}` : "Your chauffeur";
        sendNotification({
          eventType: "RIDER_DRIVER_ASSIGNED",
          recipient: { type: "user", id: userId, email: rider.email, firstName: rider.firstName, phone: rider.phone ?? undefined },
          data: {
            bookingId: assignment.booking.id,
            driverName, vehicle: assignment.booking.carName,
            pickup: assignment.booking.pickup, dropoff: assignment.booking.dropoff,
            title: "Your Safe Ride chauffeur is on the way",
            message: `${driverName} is on the way to your pickup.`,
          },
        }).catch((e) => console.error("[care en-route notify]", e));
      }
    }

    /* Nudge the customer's tracking screen out of the reservation state */
    dispatchBookingStatus({ bookingId: assignment.booking.id, status: "CONFIRMED", userId, driverId: session.driverId });

    return NextResponse.json({ ok: true, enRouteAt: updated.enRouteAt });
  } catch (e) {
    console.error("[care en-route]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
