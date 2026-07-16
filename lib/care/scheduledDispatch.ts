/**
 * lib/care/scheduledDispatch.ts
 *
 * Deferred PRIMARY dispatch for SCHEDULED Safe Ride bookings.
 *
 * Immediate (ASAP) Safe Rides dispatch the moment payment is captured (see
 * app/api/bookings/care/route.ts). A ride booked well in advance should NOT
 * ping chauffeurs hours early — instead we push every eligible chauffeur an
 * advance heads-up at booking time (so off-shift drivers can plan), then fire
 * the real targeted PRIMARY dispatch a lead-time before the scheduled pickup.
 *
 * Same fire-and-forget setTimeout pattern as lib/dispatch/standardTimeout.ts.
 * CAVEAT: in-process timers are lost on a PM2 restart — a durable cron sweep
 * over scheduled-but-undispatched bookings is the belt-and-braces fix.
 */

import { prisma } from "@/lib/prisma";
import { dispatchPrimary } from "@/lib/care/dispatch";

/** Begin PRIMARY dispatch this long before the scheduled pickup time, so a
    chauffeur has time to accept and drive to the pickup. */
export const CARE_DISPATCH_LEAD_MS = 20 * 60 * 1000; // 20 minutes

export function scheduleCareDispatch(bookingId: string, scheduledAt: Date): void {
  const delay = Math.max(0, scheduledAt.getTime() - CARE_DISPATCH_LEAD_MS - Date.now());
  setTimeout(() => {
    fireCareDispatch(bookingId).catch((e) => console.error("[care scheduled dispatch]", e));
  }, delay);
}

async function fireCareDispatch(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.bookingType !== "CARE") return;
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") return;
  if (booking.paymentStatus !== "PAID") return;

  /* Someone may have been dispatched already (e.g. admin manual assign) — don't
     double-dispatch a PRIMARY chauffeur. */
  const existingPrimary = await prisma.careAssignment.findFirst({
    where: {
      bookingId,
      role: "PRIMARY",
      status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
    },
    select: { id: true },
  });
  if (existingPrimary) return;

  await dispatchPrimary(
    bookingId,
    booking.pickupLat ?? null,
    booking.pickupLng ?? null,
    booking.userId ?? null,
  );
}
