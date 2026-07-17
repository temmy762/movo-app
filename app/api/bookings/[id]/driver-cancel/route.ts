/**
 * PATCH /api/bookings/[id]/driver-cancel
 *
 * A chauffeur who already ACCEPTED a standard ride (or reservation) but can no
 * longer make it — before the trip has actually started — backs out here.
 * Unlike /status CANCELLED, this does NOT cancel or refund the ride: the
 * booking is released back to the open pool (mirroring the existing
 * "unresponsive pre-assigned driver" self-heal in
 * lib/dispatch/standardTimeout.ts) so it can be picked up by the next
 * available online, tier-matched chauffeur automatically. The rider is told
 * we're finding them another chauffeur, not that their ride was cancelled.
 *
 * Scope: standard rides only, and only before the trip starts. Once
 * startedAt is set the rider is physically in the vehicle — that can't be
 * silently handed to a different car, so it stays out of scope here (use
 * Report Incident / admin intervention instead). Care Ride assignments have
 * their own dual-chauffeur cancel/reassign flow via CareAssignment.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";
import { scheduleStandardDispatchTimeout } from "@/lib/dispatch/standardTimeout";
import { dispatchDriverReleased, dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { pushToUser, pushToOnlineDriversByTier } from "@/lib/webpush";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    /* Only release if this driver currently holds it, it hasn't started, and
       it isn't a Care Ride (those use CareAssignment-level cancel/reassign). */
    const result = await prisma.booking.updateMany({
      where: {
        id,
        driverId:    session.driverId,
        status:      { in: ["PENDING", "CONFIRMED"] },
        startedAt:   null,
        bookingType: { not: "CARE" },
      },
      data: {
        driverId:   null,
        acceptedAt: null,
        arrivedAt:  null,
        enRouteAt:  null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "This ride can no longer be cancelled — it may have already started, completed, or been reassigned." },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        userId: true, clientName: true, pickup: true, dropoff: true,
        carTier: true, carName: true, total: true, status: true, createdAt: true,
      },
    });

    /* Tell the rider we're finding them another chauffeur — NOT that the ride
       was cancelled. Reuses the same UI path as an unresponsive pre-assigned
       driver: "reassigned" search mode + a fresh countdown window. */
    dispatchDriverReleased({ bookingId: id, userId: booking?.userId });
    if (booking?.userId) {
      pushToUser(booking.userId, {
        title: "Finding you another chauffeur",
        body:  "Your chauffeur is no longer able to complete this ride. We're contacting other chauffeurs nearby.",
        tag:   `driver-released-${id}`,
        data:  { type: "driver_released", bookingId: id },
      }).catch(() => {});
    }

    /* Re-broadcast into the pool so every other online, tier-matched
       chauffeur discovers it immediately (socket for open apps, push for
       backgrounded ones) instead of waiting for their next 5s poll tick. */
    if (booking) {
      dispatchBookingCreated({
        id, pickup: booking.pickup, dropoff: booking.dropoff,
        carTier: booking.carTier ?? "", carName: booking.carName,
        total: booking.total, status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      });
      pushToOnlineDriversByTier(booking.carTier ?? null, {
        title: "🚗 New Ride Request",
        body:  `Pickup: ${booking.pickup}`,
        tag:   `booking-${id}`,
        data:  { type: "new_booking", bookingId: id, requireInteraction: "true" },
      }).catch(() => {});
    }

    /* Re-arm the safety net so the ride still auto-refunds if truly nobody
       else accepts within the standard pool window. */
    scheduleStandardDispatchTimeout(id, "pool");

    logAudit({
      action: "booking.driver_cancelled",
      entityType: "Booking",
      entityId: id,
      actorType: "DRIVER",
      actorId: session.driverId,
      detail: { reason },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[driver-cancel]", e);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
