import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      isOnline: true,
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      lat: true,
      lng: true,
    },
  });

  return NextResponse.json(drivers);
}
