/**
 * GET /api/care/[bookingId]
 * Returns a Care booking with its CareAssignments (PRIMARY + SUPPORT).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;
    const session = await getSession(req);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        careAssignments: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                photoUrl: true,
                vehicle: { select: { make: true, model: true, year: true, plate: true, tier: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.bookingType !== "CARE") {
      return NextResponse.json({ error: "Not a Care Ride booking" }, { status: 400 });
    }

    /* Only let the booking owner, drivers assigned to it, or admins view it */
    const isAdmin  = session?.role === "ADMIN";
    const isOwner  = session?.userId && booking.userId === session.userId;
    const isDriver = session?.driverId &&
      booking.careAssignments.some((a) => a.driverId === session.driverId);

    if (!isAdmin && !isOwner && !isDriver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* The Support chauffeur is an internal operational resource and must
       never reach the customer — not their identity, not their status, not
       their existence. Only strip it for a pure rider view; admins and the
       assigned drivers still need to see both. */
    const isPureRider = isOwner && !isAdmin && !isDriver;
    const responseBooking = isPureRider
      ? { ...booking, careAssignments: booking.careAssignments.filter((a) => a.role !== "SUPPORT") }
      : booking;

    return NextResponse.json(responseBooking);
  } catch (e) {
    console.error("[care GET]", e);
    return NextResponse.json({ error: "Failed to fetch Care booking" }, { status: 500 });
  }
}
