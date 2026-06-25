import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIER_PRICE: Record<string, number> = { classic: 50, premium: 80, black: 130 };
const TIER_IMG: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black:   "/images/prive black.png",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const v = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            isOnline: true,
            phone: true,
          },
        },
      },
    });

    if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const driverStatus = v.driver.status;
    const status =
      driverStatus === "ACTIVE"
        ? "Available"
        : driverStatus === "SUSPENDED"
        ? "Maintenance"
        : "Unavailable";

    return NextResponse.json({
      id:          v.id,
      brand:       v.make,
      model:       v.model,
      year:        v.year,
      plate:       v.plate,
      tier:        v.tier,
      photoUrl:    v.photoUrl ?? null,
      image:       v.photoUrl ?? TIER_IMG[v.tier.toLowerCase()] ?? "/images/movo classic.png",
      price:       TIER_PRICE[v.tier.toLowerCase()] ?? 50,
      status,
      transmission: "Automatic",
      seats:        5,
      driverId:     v.driver.id,
      driverName:   `${v.driver.firstName} ${v.driver.lastName}`,
      driverPhone:  v.driver.phone ?? null,
      driverOnline: v.driver.isOnline,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
  }
}
