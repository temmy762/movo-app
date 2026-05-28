import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIER_PRICE: Record<string, number> = { classic: 50, premium: 80, black: 130 };
const TIER_IMG:   Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black:   "/images/prive black.png",
};

function deriveStatus(driverStatus: string, isOnline: boolean): "Available" | "Maintenance" | "Unavailable" {
  if (driverStatus === "ACTIVE")    return isOnline ? "Available" : "Available";
  if (driverStatus === "SUSPENDED") return "Maintenance";
  return "Unavailable";
}

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { driver: { select: { status: true, isOnline: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });

    const units = vehicles.map((v, i) => ({
      id:           v.id,
      brand:        v.make,
      model:        v.model,
      transmission: "Automatic" as const,
      seats:        5,
      status:       deriveStatus(v.driver.status, v.driver.isOnline),
      units:        v.driver.status === "ACTIVE" ? 1 : 0,
      price:        TIER_PRICE[v.tier.toLowerCase()] ?? 50,
      image:        TIER_IMG[v.tier.toLowerCase()]   ?? "/images/movo classic.png",
      plate:        v.plate,
      tier:         v.tier,
      driverName:   `${v.driver.firstName} ${v.driver.lastName}`,
      sort:         i,
    }));

    return NextResponse.json(units);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, price } = body;

    const driverStatusMap: Record<string, string> = {
      Available:   "ACTIVE",
      Maintenance: "SUSPENDED",
      Unavailable: "PENDING",
    };

    const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { driverId: true } });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (status) {
      await prisma.driver.update({
        where: { id: vehicle.driverId },
        data: { status: driverStatusMap[status] as never },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}
