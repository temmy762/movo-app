import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";
import { haversineKm } from "@/lib/care/dispatch";
import { MOVO_TZ } from "@/lib/winnipegTime";

/* Both ends must be this close to the saved points. Generous enough for
   "15 Berwick Court" vs "15 Berwick Ct, Winnipeg, MB R3T…" geocoding to the
   same spot, tight enough that a different street doesn't match. */
const MATCH_RADIUS_KM = 0.2;

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 0 = Sunday … 6 = Saturday, in Winnipeg time */
export function winnipegWeekday(at: Date): number {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: MOVO_TZ, weekday: "short" }).format(at);
  return WEEKDAY_INDEX[day] ?? at.getDay();
}

/** Fixed fares are before GST and carry no service fee */
export function fixedFareAmounts(fare: number, gstRate: number) {
  const gst = parseFloat((fare * gstRate).toFixed(2));
  return { fare, serviceFee: 0, additionalStopFee: 0, airportFee: 0, gst, total: parseFloat((fare + gst).toFixed(2)) };
}

/**
 * The customer's agreed fare for this trip, if one applies: same service tier,
 * pickup and drop-off within MATCH_RADIUS_KM of a saved route, on one of its
 * weekdays. Only geocodes when the customer actually has fixed fares.
 */
export async function findFixedFare(opts: {
  userId: string;
  tier: string;
  pickup: string;
  dropoff: string;
  pickupAt: Date;
}) {
  const weekday = winnipegWeekday(opts.pickupAt);
  const fares = await prisma.customerFixedFare.findMany({
    where: { userId: opts.userId, tier: opts.tier, active: true, weekdays: { has: weekday } },
  });
  if (!fares.length) return null;

  const [from, to] = await Promise.all([geocodeAddress(opts.pickup), geocodeAddress(opts.dropoff)]);
  if (!from || !to) return null;

  return fares.find(f =>
    haversineKm(from.lat, from.lng, f.pickupLat, f.pickupLng) <= MATCH_RADIUS_KM &&
    haversineKm(to.lat, to.lng, f.dropoffLat, f.dropoffLng) <= MATCH_RADIUS_KM,
  ) ?? null;
}
