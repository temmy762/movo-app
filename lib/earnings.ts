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
  return parseFloat((net * 0.5).toFixed(2));
}
