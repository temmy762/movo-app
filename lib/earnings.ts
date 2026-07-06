import { prisma } from "@/lib/prisma";

const DEFAULT_COMMISSION = 0.20;

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
  const commission = tierConfig?.commissionRate ?? DEFAULT_COMMISSION;
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
  const commission = careConfig?.commissionRate ?? DEFAULT_COMMISSION;
  const net = fare * (1 - commission);
  return parseFloat((net * 0.5).toFixed(2));
}
