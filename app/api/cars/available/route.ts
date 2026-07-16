import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TIER_NAMES: Record<string, string> = {
  classic: "Standard",
  premium: "Executive",
  black: "Concierge",
};

const TIER_IMAGES: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black: "/images/prive black.png",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") ?? "all";
  const pickupLat = parseFloat(searchParams.get("lat") ?? "");
  const pickupLng = parseFloat(searchParams.get("lng") ?? "");
  const hasPickup = !isNaN(pickupLat) && !isNaN(pickupLng);

  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      isOnline: true,
      lat: { not: null },
      lng: { not: null },
      vehicle: tier !== "all" ? { tier } : {},
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lat: true,
      lng: true,
      vehicle: {
        select: { make: true, model: true, year: true, tier: true },
      },
    },
  });

  const results = drivers
    .filter((d) => d.vehicle !== null)
    .map((d) => {
      const distKm =
        hasPickup && d.lat !== null && d.lng !== null
          ? haversineKm(pickupLat, pickupLng, d.lat, d.lng)
          : null;
      const driverTier = d.vehicle!.tier;
      const etaMins = distKm !== null ? Math.max(1, Math.round((distKm / 30) * 60)) : null;
      return {
        id: d.id,
        driverName: `${d.firstName} ${d.lastName}`,
        tierName: TIER_NAMES[driverTier] ?? driverTier,
        tierImage: TIER_IMAGES[driverTier] ?? "/images/movo classic.png",
        make: d.vehicle!.make,
        model: d.vehicle!.model,
        year: d.vehicle!.year,
        tier: driverTier,
        distanceKm: distKm !== null ? Math.round(distKm * 10) / 10 : null,
        etaMins,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  return NextResponse.json(results);
}
