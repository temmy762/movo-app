import { prisma } from "@/lib/prisma";
import { getSafeRideSettings, chauffeurWaitingShare } from "@/lib/safeRide";

const DEFAULT_COMMISSION = 0.20;

/**
 * VehicleTierConfig.commissionRate is a FRACTION (0.20 = 20%), but the admin
 * Pricing UI accepted percent-style values (20) — which made every earning
 * `fare × (1 − 20)`, i.e. a large NEGATIVE amount ("2000% platform fee").
 * Accept both forms defensively: anything above 1 is treated as a percentage.
 */
export function normalizeCommissionRate(rate: number | null | undefined): number {
  if (rate == null || !Number.isFinite(rate) || rate < 0) return DEFAULT_COMMISSION;
  const fraction = rate > 1 ? rate / 100 : rate;
  return Math.min(fraction, 0.95);
}

/**
 * A chauffeur's take-home for a standard ride, mirroring EXACTLY the credit
 * formula applied at trip completion in app/api/bookings/[id]/status/route.ts:
 *   net    = fare × (1 − platform commission for the tier)
 *   payout = net × driver's fleet split
 * so the number shown on the dashboard matches the EARNING actually credited.
 */
export async function computeDriverEarning(
  fare: number,
  carTier: string | null | undefined,
  driver: { fleetDriverSplit: number } | null,
): Promise<number> {
  if (!fare || fare <= 0) return 0;
  const tierConfig = await prisma.vehicleTierConfig
    .findFirst({
      where: { tier: { equals: carTier ?? "classic", mode: "insensitive" } },
      select: { commissionRate: true },
    })
    .catch(() => null);
  const commission = normalizeCommissionRate(tierConfig?.commissionRate);
  const net = fare * (1 - commission);
  const split = driver?.fleetDriverSplit ?? 1.0;
  return parseFloat((net * split).toFixed(2));
}

/**
 * Safe Ride (Care) per-chauffeur take-home. Mirrors the care completion split
 * in app/api/care/assignments/[id]/route.ts: net after the care-tier commission
 * is split 50/50 between PRIMARY and SUPPORT.
 */
export async function computeCareEarning(fare: number): Promise<number> {
  if (!fare || fare <= 0) return 0;
  const careConfig = await prisma.vehicleTierConfig
    .findFirst({
      where: { tier: { equals: "care", mode: "insensitive" } },
      select: { commissionRate: true },
    })
    .catch(() => null);
  const commission = normalizeCommissionRate(careConfig?.commissionRate);
  const net = fare * (1 - commission);
  return parseFloat((net * SAFE_RIDE_PRIMARY_SHARE).toFixed(2));
}

/* Share of the post-commission pool paid to PRIMARY; SUPPORT receives the rest.
   The business wants this to eventually reflect actual workload/distance/time
   rather than a flat split — when that lands, this constant becomes a
   per-booking calculation and the two roles stop being symmetrical. */
export const SAFE_RIDE_PRIMARY_SHARE = 0.5;

/**
 * What one Safe Ride chauffeur is paid for a booking.
 *
 * Bookings priced by the Safe Ride engine (chauffeurPayout set) pay:
 *   PRIMARY → the payout locked at booking + their share of any waiting charge
 *   SUPPORT → the admin-configured Support Chauffeur payout (backup only)
 * Older bookings keep the original 50/50 split of the net fare.
 */
export async function safeRideEarningFor(
  booking: { fare: number; chauffeurPayout: number | null; waitingFee: number | null; pricingSnapshot: unknown },
  role: "PRIMARY" | "SUPPORT",
): Promise<number> {
  if (booking.chauffeurPayout == null) return computeCareEarning(booking.fare);
  const settings = await getSafeRideSettings();
  if (role === "SUPPORT") return settings.supportPayout;
  /* Use the payout % in force when the booking was priced, not today's */
  const snapRate = (booking.pricingSnapshot as { payoutRate?: number } | null)?.payoutRate;
  const rate = typeof snapRate === "number" ? snapRate : settings.chauffeurPayoutRate;
  return parseFloat((booking.chauffeurPayout + chauffeurWaitingShare(booking.waitingFee, rate)).toFixed(2));
}

/**
 * Credit ONE Safe Ride chauffeur their share, idempotently.
 *
 * The two roles are paid at different moments: PRIMARY as soon as the customer
 * and their vehicle are delivered (their pay must not depend on the internal
 * return leg going smoothly), SUPPORT once it has returned PRIMARY to their
 * parked car. So idempotency is per-role, not per-booking.
 */
export async function creditSafeRideEarning(
  bookingId: string,
  role: "PRIMARY" | "SUPPORT",
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, fare: true, paymentStatus: true, chauffeurPayout: true, waitingFee: true, pricingSnapshot: true },
  });
  if (!booking || booking.paymentStatus !== "PAID" || booking.fare <= 0) return;

  const assignment = await prisma.careAssignment.findFirst({
    /* Only the chauffeur who actually took the job — dispatch offers the role
       to several chauffeurs at once and cancels the losing offers, which still
       carry a driverId. */
    where: { bookingId, role, driverId: { not: null }, status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    select: { driverId: true },
  });
  if (!assignment?.driverId) return;

  /* Marker is role-scoped so crediting PRIMARY never blocks SUPPORT's credit. */
  const marker = `[safe-ride:${bookingId}:${role}]`;
  const already = await prisma.walletTransaction.findFirst({
    where: { type: "EARNING", note: { contains: marker } },
    select: { id: true },
  });
  if (already) return;

  const amount = await safeRideEarningFor(booking, role);
  if (amount <= 0) return;

  await prisma.walletTransaction.create({
    data: {
      driverId: assignment.driverId,
      type:     "EARNING",
      status:   "COMPLETED",
      amount,
      /* Chauffeur-facing: no commission breakdown. The buyer asked that the
         chauffeur see their take-home, with the Movo cut visible to Admin only
         (it remains derivable from the booking fare). */
      note:     `Safe Ride earning — booking ${bookingId} ${marker}`,
    },
  });
}
