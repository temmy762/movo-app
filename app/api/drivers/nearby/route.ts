import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Return ALL active approved drivers who have a vehicle registered.
  // isOnline + GPS are included so the UI can show "Available Now" vs "Schedule"
  // but they are NOT used as filters — the fleet is always browsable.
  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      vehicle: { isNot: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isOnline: true,
      lat: true,
      lng: true,
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          plate: true,
          tier: true,
          photoUrl: true,
        },
      },
    },
  });

  return NextResponse.json(drivers, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" },
  });
}
