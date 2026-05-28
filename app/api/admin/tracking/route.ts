import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, driverId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        driver: {
          select: { id: true, firstName: true, lastName: true, lat: true, lng: true, isOnline: true, vehicle: { select: { make: true, model: true, plate: true, tier: true } } },
        },
      },
    });

    const vehicles = bookings
      .filter(b => b.driver?.vehicle)
      .map(b => {
        const d = b.driver!;
        const v = d.vehicle!;
        const lat = d.lat ?? 0;
        const lng = d.lng ?? 0;

        return {
          id:        b.id,
          client:    b.clientName,
          car:       `${v.make} ${v.model}`,
          carType:   v.tier,
          carNumber: v.plate,
          status:    (b.status === "CONFIRMED" ? "On Trip" : "Returned") as "On Trip" | "Returned",
          startDate: new Date(b.createdAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
          endDate:   new Date(b.updatedAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
          tripTime:  "—",
          distance:  "—",
          pos:       [lat, lng] as [number, number],
          route:     [[lat, lng]] as [number, number][],
          driverName:`${d.firstName} ${d.lastName}`,
        };
      });

    return NextResponse.json(vehicles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
