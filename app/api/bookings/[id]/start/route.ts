import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchTripStarted } from "@/lib/socket/dispatcher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, driverId: session.driverId, status: "CONFIRMED" },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found or not in CONFIRMED state" }, { status: 404 });
  }

  if (booking.startedAt) {
    return NextResponse.json({ error: "Trip already started" }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data:  { startedAt: new Date() },
  });

  /* Socket: instantly notify rider + admin the trip has started */
  dispatchTripStarted({
    bookingId,
    driverId:  booking.driverId,
    userId:    booking.userId,
    startedAt: updated.startedAt!.toISOString(),
  });

  return NextResponse.json({ ok: true, startedAt: updated.startedAt });
}
