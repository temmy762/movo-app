import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/* Official pricing defaults (used when DB rows don't exist yet) */
const TIER_DEFAULTS: Record<string, { baseFare: number; ratePerKm: number; ratePerMin: number; minFare: number }> = {
  classic: { baseFare: 4.00, ratePerKm: 1.25, ratePerMin: 0.25, minFare: 18.00 },
  premium: { baseFare: 6.00, ratePerKm: 1.75, ratePerMin: 0.35, minFare: 25.00 },
  black:   { baseFare: 8.00, ratePerKm: 2.25, ratePerMin: 0.45, minFare: 35.00 },
};

const DEFAULT_SERVICE_FEE_RATE = 0.12;
const DEFAULT_GST_RATE         = 0.05;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pickup  = searchParams.get("pickup");
    const dropoff = searchParams.get("dropoff");
    const tier    = (searchParams.get("tier") ?? "classic").toLowerCase();

    if (!pickup || !dropoff) {
      return NextResponse.json({ error: "pickup and dropoff required" }, { status: 400 });
    }

    /* Load tier config + global pricing config from DB (non-fatal) */
    const [tierConfig, pricingConfig] = await Promise.all([
      prisma.vehicleTierConfig.findFirst({
        where: { tier: { equals: tier, mode: "insensitive" } },
        select: { baseFare: true, ratePerKm: true, ratePerMin: true, minFare: true },
      }).catch(() => null),
      prisma.pricingConfig.findFirst().catch(() => null),
    ]);

    const defaults      = TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.classic;
    const baseFare      = tierConfig?.baseFare  ?? defaults.baseFare;
    const ratePerKm     = tierConfig?.ratePerKm ?? defaults.ratePerKm;
    const ratePerMin    = tierConfig?.ratePerMin ?? defaults.ratePerMin;
    const minFare       = tierConfig?.minFare   ?? defaults.minFare;
    const serviceFeeRate = pricingConfig?.serviceFeeRate ?? DEFAULT_SERVICE_FEE_RATE;
    const gstRate        = pricingConfig?.gstRate        ?? DEFAULT_GST_RATE;

    const calcFares = (distKm: number, durMin: number) => {
      const raw        = baseFare + distKm * ratePerKm + durMin * ratePerMin;
      const fare       = parseFloat(Math.max(raw, minFare).toFixed(2));
      const serviceFee = parseFloat((fare * serviceFeeRate).toFixed(2));
      const gst        = parseFloat((fare * gstRate).toFixed(2));
      const total      = parseFloat((fare + serviceFee + gst).toFixed(2));
      return { fare, serviceFee, gst, total };
    };

    /* No API key — return flat estimate (10 km, 15 min) */
    if (!GOOGLE_API_KEY) {
      const result = calcFares(10, 15);
      return NextResponse.json({ ...result, distanceKm: null, durationMin: null, gstRate, serviceFeeRate });
    }

    /* Google Distance Matrix */
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(dropoff)}&units=metric&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      const result = calcFares(10, 15);
      return NextResponse.json({ ...result, distanceKm: null, durationMin: null, gstRate, serviceFeeRate });
    }

    const distanceKm  = element.distance.value / 1000;
    const durationMin = Math.ceil(element.duration.value / 60);
    const result      = calcFares(distanceKm, durationMin);

    return NextResponse.json({ ...result, distanceKm: +distanceKm.toFixed(2), durationMin, gstRate, serviceFeeRate });
  } catch (e) {
    console.error("[estimate]", e);
    return NextResponse.json({ error: "Failed to estimate fare" }, { status: 500 });
  }
}
