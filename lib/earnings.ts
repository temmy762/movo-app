import { prisma } from "@/lib/prisma";

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
    select: { id: true, fare: true, paymentStatus: true },
  });
  if (!booking || booking.paymentStatus !== "PAID" || booking.fare <= 0) return;

  const assignment = await prisma.careAssignment.findFirst({
    where: { bookingId, role, driverId: { not: null } },
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

  const careConfig = await prisma.vehicleTierConfig
    .findFirst({
      where: { tier: { equals: "care", mode: "insensitive" } },
      select: { commissionRate: true },
    })
    .catch(() => null);
  const commission = normalizeCommissionRate(careConfig?.commissionRate);
  const net = booking.fare * (1 - commission);
  const share = role === "PRIMARY" ? SAFE_RIDE_PRIMARY_SHARE : 1 - SAFE_RIDE_PRIMARY_SHARE;

  await prisma.walletTransaction.create({
    data: {
      driverId: assignment.driverId,
      type:     "EARNING",
      status:   "COMPLETED",
      amount:   parseFloat((net * share).toFixed(2)),
      /* Chauffeur-facing: no commission breakdown. The buyer asked that the
         chauffeur see their take-home, with the Movo cut visible to Admin only
         (it remains derivable from the booking fare). */
      note:     `Safe Ride earning — booking ${bookingId} ${marker}`,
    },
  });
}
