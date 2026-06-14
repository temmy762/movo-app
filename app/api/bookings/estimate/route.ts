import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/* Fallback rates per km by tier if VehicleTierConfig has no price */
const FALLBACK_RATE: Record<string, number> = {
  classic: 1.80,
  premium: 2.50,
  black:   3.20,
};

const BASE_FARE: Record<string, number> = {
  classic: 5.00,
  premium: 7.00,
  black:   10.00,
};

const SERVICE_FEE_RATE = 0.12; /* 12% of fare */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pickup  = searchParams.get("pickup");
    const dropoff = searchParams.get("dropoff");
    const tier    = (searchParams.get("tier") ?? "classic").toLowerCase();

    if (!pickup || !dropoff) {
      return NextResponse.json({ error: "pickup and dropoff required" }, { status: 400 });
    }

    /* Try VehicleTierConfig for rate per km */
    const tierConfig = await prisma.vehicleTierConfig.findFirst({
      where: { tier: { equals: tier, mode: "insensitive" } },
      select: { price: true },
    }).catch(() => null);

    const ratePerKm = tierConfig?.price
      ? tierConfig.price / 100          /* stored in cents */
      : (FALLBACK_RATE[tier] ?? 1.80);

    const baseFare = BASE_FARE[tier] ?? 5.00;

    /* Google Distance Matrix */
    if (!GOOGLE_API_KEY) {
      /* No API key — return flat estimate */
      const fare       = parseFloat((baseFare + 10 * ratePerKm).toFixed(2));
      const serviceFee = parseFloat((fare * SERVICE_FEE_RATE).toFixed(2));
      return NextResponse.json({ fare, serviceFee, total: fare + serviceFee, distanceKm: null, durationMin: null });
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(dropoff)}&units=metric&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      const fare       = parseFloat((baseFare + 10 * ratePerKm).toFixed(2));
      const serviceFee = parseFloat((fare * SERVICE_FEE_RATE).toFixed(2));
      return NextResponse.json({ fare, serviceFee, total: +(fare + serviceFee).toFixed(2), distanceKm: null, durationMin: null });
    }

    const distanceKm  = element.distance.value / 1000;
    const durationMin = Math.ceil(element.duration.value / 60);

    const fare       = parseFloat((baseFare + distanceKm * ratePerKm).toFixed(2));
    const serviceFee = parseFloat((fare * SERVICE_FEE_RATE).toFixed(2));
    const total      = parseFloat((fare + serviceFee).toFixed(2));

    return NextResponse.json({ fare, serviceFee, total, distanceKm: +distanceKm.toFixed(2), durationMin });
  } catch (e) {
    console.error("[estimate]", e);
    return NextResponse.json({ error: "Failed to estimate fare" }, { status: 500 });
  }
}
