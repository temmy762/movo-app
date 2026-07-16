import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchDriverArrived } from "@/lib/socket/dispatcher";

const DEFAULT_FREE_WAITING_MINUTES = 5;
const DEFAULT_WAITING_RATE_PER_MIN = 0.75;

/**
 * PATCH /api/bookings/[id]/arrived
 * Chauffeur marks arrival at pickup. Persists arrivedAt (the anchor for
 * wait-time billing) and notifies the rider over the socket — previously the
 * driver app tried to emit the socket event from the CLIENT, which never
 * reached the server's io instance, and arrivedAt was never stored at all.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { driverId: true, userId: true, status: true, startedAt: true, arrivedAt: true },
    });
    if (!booking || booking.driverId !== session.driverId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (booking.status !== "CONFIRMED" || booking.startedAt) {
      return NextResponse.json({ error: "Ride is not in the pickup phase" }, { status: 409 });
    }

    /* Idempotent — keep the FIRST arrival time as the billing anchor */
    const arrivedAt = booking.arrivedAt ?? new Date();
    if (!booking.arrivedAt) {
      await prisma.booking.update({ where: { id }, data: { arrivedAt } });
    }

    dispatchDriverArrived({ bookingId: id, userId: booking.userId, driverId: session.driverId });

    const pricing = await prisma.pricingConfig.findFirst().catch(() => null);
    return NextResponse.json({
      ok: true,
      arrivedAt: arrivedAt.toISOString(),
      freeWaitingMinutes: pricing?.freeWaitingMinutes ?? DEFAULT_FREE_WAITING_MINUTES,
      waitingRatePerMin:  pricing?.waitingRatePerMin  ?? DEFAULT_WAITING_RATE_PER_MIN,
    });
  } catch (e) {
    console.error("[arrived]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
