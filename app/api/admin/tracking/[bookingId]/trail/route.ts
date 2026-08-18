/**
 * GET /api/admin/tracking/[bookingId]/trail
 *
 * GPS trail for ONE booking, loaded when an admin selects a vehicle on the
 * tracking board. Previously every vehicle's 150-point trail was bundled into
 * the roster response on every poll, even though only the selected vehicle's
 * trail is ever drawn.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const MAX_POINTS = 150;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { bookingId } = await params;

    /* Newest-first with a per-booking limit — the composite index
       (bookingId, timestamp) serves this directly. */
    const locs = await prisma.tripLocation.findMany({
      where: { bookingId },
      orderBy: { timestamp: "desc" },
      take: MAX_POINTS,
      select: { lat: true, lng: true, heading: true },
    });

    /* Reverse to chronological (oldest → newest) for polyline drawing. */
    const route = locs.map((l) => [l.lat, l.lng] as [number, number]).reverse();

    let km = 0;
    for (let i = 1; i < route.length; i++) {
      const [lat1, lng1] = route[i - 1];
      const [lat2, lng2] = route[i];
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      km += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return NextResponse.json({
      route,
      heading: locs[0]?.heading ?? 0,
      distance: route.length < 2 ? "—" : km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`,
    });
  } catch (e) {
    console.error("[admin-tracking trail]", e);
    return NextResponse.json({ error: "Failed to fetch trail" }, { status: 500 });
  }
}
