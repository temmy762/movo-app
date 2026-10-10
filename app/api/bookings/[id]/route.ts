import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/* Driver details riders see once a chauffeur has been assigned */
const DRIVER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  vehicle: {
    select: { photoUrl: true, tier: true, make: true, model: true, year: true, plate: true },
  },
  bookings: {
    where: { rating: { not: null } },
    select: { rating: true },
  },
} as const;

type DriverRow = {
  id: string; firstName: string; lastName: string; phone: string | null;
  vehicle?: { photoUrl: string | null; tier: string; make: string; model: string; year: number | null; plate: string } | null;
  bookings: { rating: number | null }[];
};

function publicDriver(d: DriverRow | null | undefined) {
  if (!d) return null;
  const ratings = d.bookings.map(b => b.rating).filter((r): r is number => r != null);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return { firstName: d.firstName, lastName: d.lastName, phone: d.phone, avgRating, vehicle: d.vehicle ?? null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        driver: { select: DRIVER_SELECT },
        careAssignments: {
          where: { role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { driverId: true, driver: { select: DRIVER_SELECT } },
        },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    /* Only the rider, their chauffeur(s) or an admin may see a booking */
    const primary = booking.careAssignments[0];
    const isAdmin  = session.role === "ADMIN";
    const isRider  = !!session.userId && booking.userId === session.userId;
    const isDriver = !!session.driverId && (booking.driverId === session.driverId || primary?.driverId === session.driverId);
    if (!isAdmin && !isRider && !isDriver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* Safe Ride's chauffeur lives on its care assignment, not booking.driver —
       expose the accepted PRIMARY as the booking's driver so riders get the
       same name / call / message / reservation states as any other ride.
       Internal pricing fields stay admin-only. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { driver, careAssignments, chauffeurPayout, pricingSnapshot, careServicePortion, careReturnAllowance, uberReturnCost, ...rest } = booking;
    return NextResponse.json({
      ...rest,
      ...(isAdmin ? { chauffeurPayout, pricingSnapshot, careServicePortion, careReturnAllowance, uberReturnCost } : {}),
      driver: publicDriver((driver ?? primary?.driver) as DriverRow | null),
    });
  } catch (e) {
    console.error("[booking GET]", e);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const booking = await prisma.booking.findUnique({ where: { id }, select: { userId: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isAdmin = session.role === "ADMIN";
    const isRider = !!session.userId && booking.userId === session.userId;
    if (!isAdmin && !isRider) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    /* Riders may only change the destination; payment and price fields are
       admin-only (this used to let anyone mark any booking PAID). */
    const body = await req.json();
    const allowedFields = isAdmin
      ? ["stripePaymentIntentId", "paymentStatus", "clientName", "additionalStopFee", "total", "dropoff"]
      : ["dropoff"];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.booking.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[booking PATCH]", e);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
