import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchRiderLocation } from "@/lib/socket/dispatcher";

/**
 * POST /api/bookings/[id]/rider-location
 * High-frequency: the rider's live position during the pickup phase, relayed
 * to the assigned chauffeur over the socket so they can navigate to the
 * passenger, not just the typed address.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { userId: true, driverId: true, status: true, startedAt: true },
    });
    if (!booking || booking.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    /* Only relevant while a chauffeur is heading to pickup */
    if (booking.status === "CONFIRMED" && booking.driverId && !booking.startedAt) {
      dispatchRiderLocation({ bookingId: id, driverId: booking.driverId, lat, lng });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[rider-location]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
