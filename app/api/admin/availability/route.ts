import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier") ?? "";          // e.g. "classic"
    const date = searchParams.get("date") ?? "";          // e.g. "2026-05-28"

    const selectedDate = date ? new Date(date) : new Date();
    const isToday =
      selectedDate.toDateString() === new Date().toDateString();
    const isFuture = selectedDate > new Date();

    // All active drivers with their vehicle
    const drivers = await prisma.driver.findMany({
      where: {
        status: "ACTIVE",
        ...(tier ? { vehicle: { tier: { equals: tier, mode: "insensitive" } } } : {}),
      },
      select: {
        id:        true,
        firstName: true,
        lastName:  true,
        isOnline:  true,
        vehicle:   { select: { make: true, model: true, year: true, plate: true, tier: true } },
        bookings:  {
          where: { status: { in: ["CONFIRMED", "PENDING"] } },
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: { firstName: "asc" },
    });

    const result = drivers.map(d => {
      // For today: busy if has any active (CONFIRMED/PENDING) booking
      // For past:  busy if had an active booking on that day
      // For future: everyone is available
      let busy = false;
      if (isFuture) {
        busy = false;
      } else if (isToday) {
        busy = d.bookings.length > 0;
      } else {
        busy = d.bookings.some(b => {
          const bd = new Date(b.createdAt);
          return bd.toDateString() === selectedDate.toDateString();
        });
      }

      return {
        id:        d.id,
        name:      `${d.firstName} ${d.lastName}`,
        car:       d.vehicle ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}` : "No vehicle",
        plate:     d.vehicle?.plate ?? "—",
        tier:      d.vehicle?.tier ?? "—",
        isOnline:  d.isOnline,
        available: !busy,
      };
    });

    return NextResponse.json({
      total:     result.length,
      available: result.filter(d => d.available).length,
      busy:      result.filter(d => !d.available).length,
      drivers:   result,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }
}
