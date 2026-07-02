/**
 * lib/dispatch/standardTimeout.ts
 *
 * Standard (non-Care) rides are broadcast to every online tier-matched driver
 * at once and rely on someone claiming them — there is no active dispatch
 * loop like Care Ride's, so nothing ever resolved a booking that no driver
 * accepted. The rider stayed charged and stuck on "Searching..." forever.
 *
 * This mirrors the fire-and-forget setTimeout pattern already proven in
 * lib/care/dispatch.ts: after a grace period, if the booking is still
 * unclaimed (driverId null) and paid, auto-cancel it, issue a full Stripe
 * refund, and notify the rider + admins.
 */

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdmins, sendNotification } from "@/lib/notifications";
import { dispatchBookingCancelled } from "@/lib/socket/dispatcher";

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

  /* Someone already has it, or it's already terminal, or nothing was paid — nothing to do */
  if (booking.driverId) return;
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") return;
  if (booking.paymentStatus !== "PAID") return;

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
