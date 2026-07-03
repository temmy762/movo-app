import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTier } from "@/lib/normalizeTier";

/* Prefer a dedicated server key: NEXT_PUBLIC_* keys are often HTTP-referrer
   restricted for the browser, which makes server-side Distance Matrix calls
   fail silently (REQUEST_DENIED) and every fare fall back to the flat
   10 km / 15 min estimate — i.e. "pricing config not applied". */
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/* Official pricing defaults (used when DB rows don't exist yet) */
const TIER_DEFAULTS: Record<string, { baseFare: number; ratePerKm: number; ratePerMin: number; minFare: number; hourlyRate: number; hourlyMinHours: number }> = {
  classic: { baseFare: 4.00, ratePerKm: 1.25, ratePerMin: 0.25, minFare: 18.00, hourlyRate: 55.00, hourlyMinHours: 2 },
  premium: { baseFare: 6.00, ratePerKm: 1.75, ratePerMin: 0.35, minFare: 25.00, hourlyRate: 75.00, hourlyMinHours: 2 },
  black:   { baseFare: 8.00, ratePerKm: 2.25, ratePerMin: 0.45, minFare: 35.00, hourlyRate: 95.00, hourlyMinHours: 2 },
};

const DEFAULT_SERVICE_FEE_RATE       = 0.12;
const DEFAULT_GST_RATE               = 0.05;
const DEFAULT_ADDITIONAL_STOP_FEE    = 5.00;
const DEFAULT_AIRPORT_PICKUP_FEE     = 10.00;
const DEFAULT_FREE_WAITING_MINUTES   = 5;
const DEFAULT_WAITING_RATE_PER_MIN   = 0.75;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pickup    = searchParams.get("pickup");
    const dropoff   = searchParams.get("dropoff");
    /* Normalize legacy/UI tier labels ("First Class", "Economy", "all", …) to
       the canonical config keys so the admin-configured rates actually match. */
    const tier      = normalizeTier(searchParams.get("tier"));
    const stops     = Math.max(0, parseInt(searchParams.get("stops") ?? "0", 10) || 0);
    const isAirport = searchParams.get("isAirport") === "true";
    const isHourly  = searchParams.get("mode") === "hourly";
    const hours     = Math.max(1, parseInt(searchParams.get("hours") ?? "2", 10) || 2);

    if (!pickup || (!dropoff && !isHourly)) {
      return NextResponse.json({ error: "pickup and dropoff required" }, { status: 400 });
    }

    /* Load tier config + global pricing config from DB (non-fatal) */
    const [tierConfig, pricingConfig] = await Promise.all([
      prisma.vehicleTierConfig.findFirst({
        where: { tier: { equals: tier, mode: "insensitive" } },
        select: { baseFare: true, ratePerKm: true, ratePerMin: true, minFare: true, hourlyRate: true, hourlyMinHours: true },
      }).catch(() => null),
      prisma.pricingConfig.findFirst().catch(() => null),
    ]);

    const defaults           = TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.classic;
    const baseFare           = tierConfig?.baseFare  ?? defaults.baseFare;
    const ratePerKm          = tierConfig?.ratePerKm ?? defaults.ratePerKm;
    const ratePerMin         = tierConfig?.ratePerMin ?? defaults.ratePerMin;
    const minFare            = tierConfig?.minFare   ?? defaults.minFare;
    const hourlyRate         = tierConfig?.hourlyRate     ?? defaults.hourlyRate;
    const hourlyMinHours     = tierConfig?.hourlyMinHours ?? defaults.hourlyMinHours;
    const serviceFeeRate     = pricingConfig?.serviceFeeRate     ?? DEFAULT_SERVICE_FEE_RATE;
    const gstRate            = pricingConfig?.gstRate            ?? DEFAULT_GST_RATE;
    const stopFeeUnit        = pricingConfig?.additionalStopFee  ?? DEFAULT_ADDITIONAL_STOP_FEE;
    const airportFeeUnit     = pricingConfig?.airportPickupFee   ?? DEFAULT_AIRPORT_PICKUP_FEE;
    const freeWaitingMinutes = pricingConfig?.freeWaitingMinutes ?? DEFAULT_FREE_WAITING_MINUTES;
    const waitingRatePerMin  = pricingConfig?.waitingRatePerMin  ?? DEFAULT_WAITING_RATE_PER_MIN;

    const finishFares = (fare: number) => {
      const additionalStopFee = parseFloat((stops * stopFeeUnit).toFixed(2));
      const airportFee      = isAirport ? parseFloat(airportFeeUnit.toFixed(2)) : 0;
      const serviceFee      = parseFloat((fare * serviceFeeRate).toFixed(2));
      /* GST applies to all taxable amounts: ride fare + extra charges + service fee */
      const taxableAmount   = fare + additionalStopFee + airportFee + serviceFee;
      const gst             = parseFloat((taxableAmount * gstRate).toFixed(2));
      const total           = parseFloat((taxableAmount + gst).toFixed(2));
      return { fare, additionalStopFee, airportFee, serviceFee, gst, total };
    };

    const calcFares = (distKm: number, durMin: number) => {
      const raw = baseFare + distKm * ratePerKm + durMin * ratePerMin;
      return finishFares(parseFloat(Math.max(raw, minFare).toFixed(2)));
    };

    const meta = {
      tier, gstRate, serviceFeeRate, stopFeeUnit, airportFeeUnit,
      freeWaitingMinutes, waitingRatePerMin,
      stops, isAirport,
    };

    /* Hourly charter: fare = configured hourly rate × booked hours (min-hours enforced) */
    if (isHourly) {
      const billedHours = Math.max(hours, hourlyMinHours);
      const fare = parseFloat((hourlyRate * billedHours).toFixed(2));
      return NextResponse.json({
        ...finishFares(fare),
        distanceKm: null, durationMin: billedHours * 60,
        hourly: { rate: hourlyRate, billedHours, minHours: hourlyMinHours },
        estimateBasis: "hourly",
        ...meta,
      });
    }

    /* No API key — return flat estimate (10 km, 15 min) */
    if (!GOOGLE_API_KEY) {
      console.error("[estimate] No Google Maps API key configured — falling back to flat 10km/15min estimate");
      const result = calcFares(10, 15);
      return NextResponse.json({ ...result, distanceKm: null, durationMin: null, estimateBasis: "flat", ...meta });
    }

    /* Google Distance Matrix */
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(dropoff!)}&units=metric&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      /* Loud log — a referrer-restricted key fails here on EVERY request and
         silently degrades all fares to the flat estimate. */
      console.error(
        `[estimate] Distance Matrix failed (top-level: ${data?.status ?? "?"}, element: ${element?.status ?? "missing"}` +
        `${data?.error_message ? `, message: ${data.error_message}` : ""}) — falling back to flat 10km/15min estimate`
      );
      const result = calcFares(10, 15);
      return NextResponse.json({ ...result, distanceKm: null, durationMin: null, estimateBasis: "flat", ...meta });
    }

    const distanceKm  = element.distance.value / 1000;
    const durationMin = Math.ceil(element.duration.value / 60);
    const result      = calcFares(distanceKm, durationMin);

    return NextResponse.json({ ...result, distanceKm: +distanceKm.toFixed(2), durationMin, estimateBasis: "route", ...meta });
  } catch (e) {
    console.error("[estimate]", e);
    return NextResponse.json({ error: "Failed to estimate fare" }, { status: 500 });
  }
}
