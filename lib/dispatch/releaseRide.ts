/**
 * A chauffeur who accepted a standard ride (or reservation) but can no longer
 * make it — before the trip starts — releases it. The ride is NOT cancelled
 * or refunded: it goes back into the open pool for the next available,
 * tier-matched chauffeur, and the rider keeps searching ("Finding you another
 * chauffeur"). Mirrors the "unresponsive pre-assigned driver" self-heal in
 * lib/dispatch/standardTimeout.ts.
 *
 * Used by /api/bookings/[id]/driver-cancel and by /status when the assigned
 * chauffeur asks to cancel, so every chauffeur cancel button behaves the same.
 * Safe Ride has its own CareAssignment cancel/reassign flow.
 */
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLog";
import { scheduleStandardDispatchTimeout } from "@/lib/dispatch/standardTimeout";
import { dispatchDriverReleased, dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { pushToUser, pushToOnlineDriversByTier } from "@/lib/webpush";

export async function releaseRideToPool(bookingId: string, driverId: string, reason?: string | null): Promise<boolean> {
  /* Only if this chauffeur holds it, it hasn't started, and it isn't Safe Ride */
  const result = await prisma.booking.updateMany({
    where: {
      id:          bookingId,
      driverId,
      status:      { in: ["PENDING", "CONFIRMED"] },
      startedAt:   null,
      bookingType: { not: "CARE" },
    },
    data: { driverId: null, acceptedAt: null, arrivedAt: null, enRouteAt: null },
  });
  if (result.count === 0) return false;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      userId: true, pickup: true, dropoff: true,
      carTier: true, carName: true, total: true, status: true, createdAt: true,
    },
  });

  /* Tell the rider we're finding them another chauffeur — not that the ride
     was cancelled ("reassigned" search mode + a fresh countdown window) */
  dispatchDriverReleased({ bookingId, userId: booking?.userId });
  if (booking?.userId) {
    pushToUser(booking.userId, {
      title: "Finding you another chauffeur",
      body:  "Your chauffeur is no longer able to complete this ride. We're contacting other chauffeurs nearby.",
      tag:   `driver-released-${bookingId}`,
      data:  { type: "driver_released", bookingId },
    }).catch(() => {});
  }

  /* Back into the pool: socket for open apps, push for backgrounded ones */
  if (booking) {
    dispatchBookingCreated({
      id: bookingId, pickup: booking.pickup, dropoff: booking.dropoff,
      carTier: booking.carTier ?? "", carName: booking.carName,
      total: booking.total, status: booking.status,
      createdAt: booking.createdAt.toISOString(),
    });
    pushToOnlineDriversByTier(booking.carTier ?? null, {
      title: "🚗 New Ride Request",
      body:  `Pickup: ${booking.pickup}`,
      tag:   `booking-${bookingId}`,
      data:  { type: "new_booking", bookingId, requireInteraction: "true" },
    }).catch(() => {});
  }

  /* Still auto-refunds if truly nobody else accepts within the pool window */
  scheduleStandardDispatchTimeout(bookingId, "pool");

  logAudit({
    action: "booking.driver_cancelled",
    entityType: "Booking",
    entityId: bookingId,
    actorType: "DRIVER",
    actorId: driverId,
    detail: { reason: reason ?? null },
  }).catch(() => {});

  return true;
}
