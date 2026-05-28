import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = await (prisma.booking.findUnique as any)({
      where: { id },
      include: {
        driver: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            bookings: {
              where: { rating: { not: null } },
              select: { rating: true },
            },
          },
        },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const { driver, ...bookingData } = booking as {
      driver?: { firstName: string; lastName: string; phone: string | null; bookings: { rating: number }[] } | null;
      [key: string]: unknown;
    };

    let avgRating: number | null = null;
    if (driver?.bookings?.length) {
      const ratings = driver.bookings.map((b: { rating: number }) => b.rating);
      avgRating = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    }

    return NextResponse.json({
      ...bookingData,
      driver: driver
        ? { firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone, avgRating }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}
