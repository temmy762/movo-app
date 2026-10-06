import { prisma } from "@/lib/prisma";
import type { SafeRideConfig } from "@prisma/client";

/**
 * Safe Ride pricing engine (Milestone 2, agreed with the Movo Team):
 *
 *   Service portion = max(minimum, base + per-km × trip km + per-min × trip min)
 *   Return Logistics Allowance (RLA) = estimated Uber cost for the chauffeur's
 *     return (destination → original pickup), with a floor, then a buffer
 *     (base %, + extra % when the return falls in the late-night window) and
 *     the admin-controlled high-demand multiplier
 *   Customer fare = service portion + RLA, plus GST. No separate service fee.
 *   Chauffeur payout = payout % × service portion — locked at booking and
 *     never reduced by the actual Uber cost (Movo carries that risk).
 *
 * Service-portion rates live on the "care" VehicleTierConfig row; everything
 * else is in SafeRideConfig. Both are editable from the admin Pricing page.
 */

export type SafeRideSettings = Omit<SafeRideConfig, "id" | "createdAt" | "updatedAt">;

export const SAFE_RIDE_DEFAULTS: SafeRideSettings = {
  returnBaseFare:      3.50,
  returnPerKm:         0.90,
  returnPerMin:        0.30,
  returnBookingFee:    2.50,
  returnMinimum:       10.00,
  returnBufferRate:    0.15,
  lateNightBufferRate: 0.10,
  lateNightStartHour:  22,
  lateNightEndHour:    6,
  demandMultiplier:    1.0,
  chauffeurPayoutRate: 0.70,
  supportPayout:       40.00,
  freeWaitingMinutes:  3,
  waitingRatePerMin:   1.00,
  defaultReturnMode:   "UBER",
};

export const SAFE_RIDE_SERVICE_DEFAULTS = { baseFare: 15.00, ratePerKm: 2.75, ratePerMin: 0.55, minFare: 129.00 };

/* Movo operates in Winnipeg — "late night" is judged on local time */
const LOCAL_TIME_ZONE = "America/Winnipeg";

export async function getSafeRideSettings(): Promise<SafeRideSettings> {
  const row = await prisma.safeRideConfig.findFirst().catch(() => null);
  if (!row) return SAFE_RIDE_DEFAULTS;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...settings } = row;
  return settings;
}

export async function getSafeRideServiceRates(): Promise<typeof SAFE_RIDE_SERVICE_DEFAULTS> {
  const tier = await prisma.vehicleTierConfig
    .findFirst({
      where: { tier: { equals: "care", mode: "insensitive" } },
      select: { baseFare: true, ratePerKm: true, ratePerMin: true, minFare: true },
    })
    .catch(() => null);
  return tier ?? SAFE_RIDE_SERVICE_DEFAULTS;
}

function localHour(at: Date): number {
  const h = new Intl.DateTimeFormat("en-CA", { hour: "numeric", hourCycle: "h23", timeZone: LOCAL_TIME_ZONE }).format(at);
  return parseInt(h, 10) % 24;
}

/** True when `at` (local time) falls in the late-night window, which may wrap midnight. */
export function isLateNight(at: Date, startHour: number, endHour: number): boolean {
  const h = localHour(at);
  return startHour <= endHour ? h >= startHour && h < endHour : h >= startHour || h < endHour;
}

/* Half-up to the cent. Trimming float noise first stops e.g. 22.20 × 1.15 × 1.5
   (= 38.29499999…) from rounding down instead of to $38.30. */
const round2 = (n: number) => Math.round(parseFloat((n * 100).toFixed(6))) / 100;

export type SafeRidePrice = {
  servicePortion: number;
  returnAllowance: number;
  /** What the customer pays before GST: service portion + RLA */
  fare: number;
  gst: number;
  total: number;
  chauffeurPayout: number;
  snapshot: {
    tripKm: number; tripMin: number; returnKm: number; returnMin: number;
    serviceRates: typeof SAFE_RIDE_SERVICE_DEFAULTS;
    returnEstimate: number; lateNight: boolean; bufferRate: number;
    demandMultiplier: number; payoutRate: number; gstRate: number;
    returnAt: string;
  };
};

export function priceSafeRide(opts: {
  tripKm: number; tripMin: number;
  returnKm: number; returnMin: number;
  /** When the chauffeur's return trip is expected to happen */
  returnAt: Date;
  serviceRates: typeof SAFE_RIDE_SERVICE_DEFAULTS;
  settings: SafeRideSettings;
  gstRate: number;
}): SafeRidePrice {
  const { tripKm, tripMin, returnKm, returnMin, returnAt, serviceRates: r, settings: s, gstRate } = opts;

  const servicePortion = round2(Math.max(r.minFare, r.baseFare + tripKm * r.ratePerKm + tripMin * r.ratePerMin));

  const returnEstimate = round2(Math.max(
    s.returnMinimum,
    s.returnBaseFare + returnKm * s.returnPerKm + returnMin * s.returnPerMin + s.returnBookingFee,
  ));
  const lateNight  = isLateNight(returnAt, s.lateNightStartHour, s.lateNightEndHour);
  const bufferRate = s.returnBufferRate + (lateNight ? s.lateNightBufferRate : 0);
  const returnAllowance = round2(returnEstimate * (1 + bufferRate) * Math.max(1, s.demandMultiplier));

  const fare  = round2(servicePortion + returnAllowance);
  const gst   = round2(fare * gstRate);
  const total = round2(fare + gst);

  return {
    servicePortion, returnAllowance, fare, gst, total,
    chauffeurPayout: round2(servicePortion * s.chauffeurPayoutRate),
    snapshot: {
      tripKm, tripMin, returnKm, returnMin, serviceRates: r,
      returnEstimate, lateNight, bufferRate,
      demandMultiplier: Math.max(1, s.demandMultiplier),
      payoutRate: s.chauffeurPayoutRate, gstRate,
      returnAt: returnAt.toISOString(),
    },
  };
}

/** Portion of a waiting charge (pre-GST) the chauffeur receives. */
export function chauffeurWaitingShare(waitingFee: number | null | undefined, payoutRate: number): number {
  return round2((waitingFee ?? 0) * payoutRate);
}
