/**
 * PATCH /api/bookings/[id]/stops   { stops: string[] }
 *
 * Reorder the stops on an active ride (same stops, new travel order). The
 * chauffeur's screen updates live. No price change — the same addresses are
 * visited, only the order changes.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyRouteChange } from "@/lib/rideChanges";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json({ error: "Ride is no longer active" }, { status: 409 });
    }

    const current = Array.isArray(booking.stops) ? (booking.stops as string[]) : [];
    const body = await req.json().catch(() => ({}));
    const next = Array.isArray(body?.stops) ? (body.stops as unknown[]).filter((s): s is string => typeof s === "string") : [];

    /* Must be exactly the same stops, just reordered */
    const same = next.length === current.length && [...next].sort().join("\u0000") === [...current].sort().join("\u0000");
    if (!same) return NextResponse.json({ error: "Stops can only be reordered here" }, { status: 400 });

    const updated = await prisma.booking.update({ where: { id }, data: { stops: next } });
    await notifyRouteChange(booking, { dropoff: booking.dropoff, stops: next }, "stops_reordered",
      `Stop order changed: ${next.map((s, i) => `${i + 1}. ${s}`).join(" → ")}`);
    return NextResponse.json({ ok: true, stops: updated.stops });
  } catch (e) {
    console.error("[stops reorder]", e);
    return NextResponse.json({ error: "Failed to reorder stops" }, { status: 500 });
  }
}
