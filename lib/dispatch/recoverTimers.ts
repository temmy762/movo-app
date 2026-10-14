/**
 * Dispatch timers (no-chauffeur refund, scheduled Safe Ride dispatch, Safe
 * Ride retry rounds) are in-process setTimeouts, so a server restart — every
 * deploy — used to drop them: a rider waiting at that moment was never
 * refunded, and a scheduled Safe Ride was never dispatched. Called once at
 * startup (instrumentation.ts) to re-arm them from the database.
 */
import { prisma } from "@/lib/prisma";
import { scheduleStandardDispatchTimeout, POOL_SEARCH_TIMEOUT_MS } from "@/lib/dispatch/standardTimeout";
import { scheduleCareDispatch, CARE_DISPATCH_LEAD_MS } from "@/lib/care/scheduledDispatch";
import { dispatchPrimary, dispatchSupport } from "@/lib/care/dispatch";

const SCHEDULED_THRESHOLD_MS = 25 * 60 * 1000;
/* A dispatch offer older than this was lost with the old process */
const STALE_OFFER_MS = 60 * 1000;

const isScheduledRide = (b: { scheduledAt: Date | null; createdAt: Date }) =>
  !!b.scheduledAt && b.scheduledAt.getTime() - b.createdAt.getTime() > SCHEDULED_THRESHOLD_MS;

export async function recoverDispatchTimers(): Promise<void> {
  const now = Date.now();

  /* ── In-City: paid, waiting for a chauffeur → re-arm the refund timeout ── */
  const waiting = await prisma.booking.findMany({
    where: {
      bookingType: { not: "CARE" },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: "PAID",
      startedAt: null,
      OR: [{ driverId: null }, { acceptedAt: null }],
    },
    select: { id: true, scheduledAt: true, createdAt: true, updatedAt: true, driverId: true },
  });
  let expired = 0;
  for (const b of waiting) {
    /* Scheduled: window runs from the pickup time. ASAP: from the last change
       (creation, or the moment a chauffeur released it). */
    const anchor = isScheduledRide(b) ? b.scheduledAt! : b.updatedAt;
    const overdue = now - anchor.getTime() > POOL_SEARCH_TIMEOUT_MS;
    if (overdue && b.driverId) {
      /* Long past its window: never re-offer a stale ride to chauffeurs —
         detach the silent chauffeur quietly so the timeout goes straight to
         cancel + refund instead of releasing it back into the pool */
      await prisma.booking.updateMany({
        where: { id: b.id, driverId: b.driverId, acceptedAt: null, startedAt: null },
        data: { driverId: null },
      });
    }
    if (overdue) expired++;
    scheduleStandardDispatchTimeout(b.id, "pool", overdue ? new Date(0) : anchor);
  }

  /* ── Safe Ride ── */
  const care = await prisma.booking.findMany({
    where: {
      bookingType: "CARE",
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: "PAID",
      startedAt: null,
    },
    select: {
      id: true, userId: true, scheduledAt: true, createdAt: true, returnMode: true,
      pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true,
      careAssignments: { select: { role: true, status: true, dispatchedAt: true } },
    },
  });
  let reDispatched = 0;
  for (const b of care) {
    const primaries = b.careAssignments.filter((a) => a.role === "PRIMARY");
    const primaryAccepted = primaries.some((a) => ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"].includes(a.status));

    if (!primaryAccepted) {
      /* Scheduled and not due yet → re-arm the deferred dispatch */
      if (isScheduledRide(b) && b.scheduledAt!.getTime() - CARE_DISPATCH_LEAD_MS > now && primaries.length === 0) {
        scheduleCareDispatch(b.id, b.scheduledAt!);
        continue;
      }
      /* Due (or ASAP) with an offer in flight or never dispatched → restart.
         All offers already expired means dispatch was exhausted — admin has
         been alerted, leave it to them. */
      const inFlight = primaries.filter((a) => a.status === "PENDING");
      if (primaries.length === 0 || inFlight.length > 0) {
        if (inFlight.some((a) => a.dispatchedAt && now - a.dispatchedAt.getTime() < STALE_OFFER_MS)) continue;
        await prisma.careAssignment.updateMany({
          where: { bookingId: b.id, role: "PRIMARY", status: "PENDING" },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        dispatchPrimary(b.id, b.pickupLat, b.pickupLng, b.userId).catch(() => {});
        reDispatched++;
      }
      continue;
    }

    /* PRIMARY accepted; Support-chauffeur return with its search interrupted */
    if (b.returnMode === "SUPPORT") {
      const supports = b.careAssignments.filter((a) => a.role === "SUPPORT");
      const supportOk = supports.some((a) => ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"].includes(a.status));
      const inFlight = supports.filter((a) => a.status === "PENDING");
      if (!supportOk && inFlight.length > 0 &&
          !inFlight.some((a) => a.dispatchedAt && now - a.dispatchedAt.getTime() < STALE_OFFER_MS)) {
        await prisma.careAssignment.updateMany({
          where: { bookingId: b.id, role: "SUPPORT", status: "PENDING" },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        dispatchSupport(b.id, b.dropoffLat, b.dropoffLng, b.userId).catch(() => {});
        reDispatched++;
      }
    }
  }

  console.log(`[recover timers] re-armed ${waiting.length} In-City timeout(s) (${expired} already overdue → cancel + refund), ${care.length} Safe Ride booking(s) checked, ${reDispatched} re-dispatched`);
}
