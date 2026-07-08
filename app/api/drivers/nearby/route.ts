import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Return ALL active approved drivers who have a vehicle registered.
  // isOnline + GPS are included so the UI can show "Available Now" vs "Schedule"
  // but they are NOT used as filters — the fleet is always browsable.
  // Keep this payload minimal: it's polled by the rider map and gated the
  // available-cars skeleton. vehicle.photoUrl in particular is often a
  // multi-MB base64 data URI — including it per driver made this endpoint
  // take tens of seconds. No consumer needs it (map uses id/lat/lng,
  // available-cars uses isOnline + tier), and names/plates shouldn't be
  // exposed on a public endpoint anyway.
  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      vehicle: { isNot: null },
    },
    select: {
      id: true,
      isOnline: true,
      lat: true,
      lng: true,
      vehicle: {
        select: {
          tier: true,
        },
      },
    },
  });

  return NextResponse.json(drivers, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" },
  });
}
