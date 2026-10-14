import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchTripStarted } from "@/lib/socket/dispatcher";
import { settleWaitingCharge } from "@/lib/waitingCharge";

const DEFAULT_FREE_WAITING_MINUTES = 5;
const DEFAULT_WAITING_RATE_PER_MIN = 0.75;

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

  /* Atomic: a double tap must not start (and bill waiting) twice */
  const startedAt = new Date();
  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, driverId: session.driverId, status: "CONFIRMED", startedAt: null },
    data:  { startedAt },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Trip already started" }, { status: 409 });
  }
  const updated = { startedAt };

  /* Bill any wait time beyond the free window (fire-and-forget) */
  prisma.pricingConfig.findFirst().catch(() => null).then((pricing) =>
    settleWaitingCharge({
      booking,
      arrivedAt:   booking.arrivedAt,
      startedAt:   updated.startedAt!,
      freeMinutes: pricing?.freeWaitingMinutes ?? DEFAULT_FREE_WAITING_MINUTES,
      ratePerMin:  pricing?.waitingRatePerMin  ?? DEFAULT_WAITING_RATE_PER_MIN,
      gstRate:     pricing?.gstRate ?? 0.05,
    }),
  ).catch((e) => console.error("[start] waiting settlement failed:", e));

  /* Socket: instantly notify rider + admin the trip has started */
  dispatchTripStarted({
    bookingId,
    driverId:  booking.driverId,
    userId:    booking.userId,
    startedAt: updated.startedAt!.toISOString(),
  });

  return NextResponse.json({ ok: true, startedAt: updated.startedAt });
}
