/**
 * PATCH /api/bookings/[id]/en-route
 *
 * The chauffeur, on the scheduled date, taps "I'm heading to pickup" for a
 * reserved ride. This activates it (moving it out of Reserved Rides into the
 * active-ride flow) and — crucially — this is the ONLY point at which the rider
 * gets the "your chauffeur is on the way" notification for a scheduled ride,
 * never days early at booking/accept time.
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

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user:   { select: { id: true, email: true, firstName: true, phone: true } },
        driver: { select: { firstName: true, lastName: true, vehicle: { select: { make: true, model: true, plate: true } } } },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.driverId !== session.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Ride is not in a confirmed state" }, { status: 409 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { enRouteAt: new Date() },
    });

    /* Now — and only now — tell the rider their chauffeur is on the way. */
    if (booking.user?.email && booking.driver) {
      const driverName = `${booking.driver.firstName} ${booking.driver.lastName}`;
      const vehicle = booking.driver.vehicle
        ? `${booking.driver.vehicle.make} ${booking.driver.vehicle.model} (${booking.driver.vehicle.plate})`
        : "N/A";
      sendNotification({
        eventType: "RIDER_DRIVER_ASSIGNED",
        recipient: { type: "user", id: booking.user.id, email: booking.user.email, firstName: booking.user.firstName, phone: booking.user.phone ?? undefined },
        data: { bookingId: id, driverName, vehicle, pickup: booking.pickup, dropoff: booking.dropoff },
      }).catch(() => {});
    }

    /* Nudge the rider's tracking screen out of the scheduled/waiting state */
    dispatchBookingStatus({ bookingId: id, status: "CONFIRMED", userId: booking.userId, driverId: booking.driverId });

    return NextResponse.json({ ok: true, enRouteAt: updated.enRouteAt });
  } catch (e) {
    console.error("[en-route]", e);
    return NextResponse.json({ error: "Failed to activate reserved ride" }, { status: 500 });
  }
}
