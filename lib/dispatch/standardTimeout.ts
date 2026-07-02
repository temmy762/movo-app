/**
 * lib/dispatch/standardTimeout.ts
 *
 * Standard (non-Care) rides are broadcast to every online tier-matched driver
 * at once and rely on someone claiming them — there is no active dispatch
 * loop like Care Ride's, so nothing ever resolved a booking that no driver
 * accepted. The rider stayed charged and stuck on "Searching..." forever.
 *
 * This mirrors the fire-and-forget setTimeout pattern already proven in
 * lib/care/dispatch.ts: after a grace period —
 *   · unclaimed pool booking (driverId null)          → cancel + full refund
 *   · pre-assigned driver who never accepted/declined → release to the open
 *     pool, re-alert online drivers, and give it one more window before the
 *     refund path kicks in
 * and notify the rider + admins accordingly. A driver who actively accepted
 * (acceptedAt set) is never touched.
 */

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdmins, sendNotification } from "@/lib/notifications";
import { dispatchBookingCancelled, dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { pushToOnlineDriversByTier } from "@/lib/webpush";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const STANDARD_DISPATCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function scheduleStandardDispatchTimeout(bookingId: string): void {
  setTimeout(() => {
    resolveStaleBooking(bookingId).catch((e) =>
      console.error("[standard dispatch timeout]", e)
    );
  }, STANDARD_DISPATCH_TIMEOUT_MS);
}

async function resolveStaleBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  /* Terminal, in progress, or nothing paid — nothing to do */
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") return;
  if (booking.startedAt) return;
  if (booking.paymentStatus !== "PAID") return;

  /* Driver actively accepted — the ride is in good hands, leave it alone */
  if (booking.driverId && booking.acceptedAt) return;

  /* Pre-assigned driver never responded (no accept, no decline) — don't punish
     the rider for the driver's inactivity. Release the booking to the open
     pool, re-alert every online tier-matched driver, and give it one more
     timeout window. If nobody claims it then, the refund path below runs
     (driverId is null on the next pass). */
  if (booking.driverId && !booking.acceptedAt) {
    const released = await prisma.booking.updateMany({
      /* Re-check driverId in the WHERE to avoid clobbering a concurrent accept */
      where: { id: bookingId, driverId: booking.driverId, acceptedAt: null, startedAt: null },
      data:  { driverId: null },
    });
    if (released.count === 0) return;

    console.warn(`[standard dispatch timeout] released unresponsive driver ${booking.driverId} from booking ${bookingId}`);

    dispatchBookingCreated({
      id: booking.id, pickup: booking.pickup, dropoff: booking.dropoff,
      carTier: booking.carTier ?? "", carName: booking.carName,
      total: booking.total, status: booking.status,
      createdAt: booking.createdAt.toISOString(),
    });
    pushToOnlineDriversByTier(booking.carTier ?? null, {
      title: "🚗 New Ride Request",
      body:  `Pickup: ${booking.pickup}`,
      tag:   `booking-${booking.id}`,
      data:  { type: "new_booking", bookingId: booking.id, requireInteraction: "true" },
    }).catch(() => {});

    scheduleStandardDispatchTimeout(bookingId);
    return;
  }

  let refunded = false;
  let refundId: string | undefined;

  if (booking.stripePaymentIntentId) {
    try {
      const refund = await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
      refunded = true;
      refundId = refund.id;
    } catch (e) {
      console.error("[standard dispatch timeout] refund failed:", e);
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "system_timeout",
      ...(refunded ? { paymentStatus: "REFUNDED", refundId } : {}),
    },
  });

  dispatchBookingCancelled({
    bookingId,
    driverId: null,
    userId: booking.userId,
    cancelledBy: "system_timeout",
    refunded,
  });

  if (booking.userId) {
    const user = await prisma.user.findUnique({
      where: { id: booking.userId },
      select: { email: true, firstName: true, phone: true },
    });
    if (user?.email) {
      sendNotification({
        eventType: "RIDER_RIDE_UNAVAILABLE_REFUNDED",
        recipient: { type: "user", id: booking.userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
        data: {
          bookingId,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          total: booking.total,
        },
      }).catch(() => {});
    }
  }

  notifyAdmins(
    "ADMIN_RIDE_DISPATCH_FAILED",
    {
      bookingId,
      clientName: booking.clientName,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      refunded,
    },
    ["EMAIL", "IN_APP", "SMS"],
  ).catch((e) => console.error("[standard dispatch timeout] notifyAdmins failed:", e));
}
