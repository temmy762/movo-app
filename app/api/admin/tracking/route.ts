/**
 * GET /api/admin/tracking?scope=live|all
 *
 * Roster for the admin live-tracking board. Live positions arrive over the
 * socket (DRIVER_LOCATION → "admin" room); this endpoint only seeds the list
 * and each vehicle's CURRENT position.
 *
 * Deliberately avoids Prisma's nested `include` (booking → driver → vehicle):
 * that expands into a cascade of round-trips and measured ~3.3s against the
 * pooler, versus ~0.2ms of actual SQL. Three flat batched queries instead.
 *
 * Full GPS trails are NOT returned here — 50 vehicles × 150 points was sent on
 * every poll while only the selected vehicle's trail is ever drawn. The trail
 * is fetched per-vehicle from ./[bookingId]/trail on selection.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    /* Default to live trips only. Completed trips are history and would other-
       wise dominate the 50-row window and push active trips out of view. */
    const scope = req.nextUrl.searchParams.get("scope") === "all" ? "all" : "live";
    const statuses = scope === "all"
      ? (["CONFIRMED", "COMPLETED"] as const)
      : (["CONFIRMED"] as const);

    const bookings = await prisma.booking.findMany({
      where: { status: { in: [...statuses] }, driverId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, clientName: true, status: true, driverId: true,
        createdAt: true, updatedAt: true, startedAt: true,
        pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true,
      },
    });

    if (bookings.length === 0) return NextResponse.json([]);

    const driverIds = [...new Set(bookings.map((b) => b.driverId!).filter(Boolean))];
    const activeIds = bookings.filter((b) => b.status === "CONFIRMED").map((b) => b.id);

    /* Two flat lookups, batched — not one per booking. */
    const [drivers, vehicles_, latestLocs] = await Promise.all([
      prisma.driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, firstName: true, lastName: true, lat: true, lng: true, isOnline: true },
      }),
      /* photoUrl is deliberately NOT selected. Vehicle photos are stored as
         base64 data URIs in the column (12MB across 6 rows, one is 5MB), so
         selecting it made this request transfer megabytes and took ~12s
         against a 0.04ms query. The selected vehicle's photo is served
         separately by ./[bookingId]/photo, which the browser can cache. */
      prisma.$queryRaw<{ driverId: string; make: string | null; model: string | null; plate: string | null; tier: string | null; hasPhoto: boolean }[]>`
        SELECT "driverId", "make", "model", "plate", "tier", ("photoUrl" IS NOT NULL) AS "hasPhoto"
        FROM "Vehicle" WHERE "driverId" = ANY(${driverIds})
      `,
      /* Only the newest point per active booking is needed to place the marker.
         Bounded by active trip count, not by trail length. */
      activeIds.length > 0
        ? prisma.tripLocation.findMany({
            where: { bookingId: { in: activeIds } },
            orderBy: { timestamp: "desc" },
            take: 400,
            select: { bookingId: true, lat: true, lng: true, heading: true, timestamp: true },
          })
        : Promise.resolve([] as { bookingId: string; lat: number; lng: number; heading: number | null; timestamp: Date }[]),
    ]);

    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    const vehicleMap = new Map(vehicles_.map((v) => [v.driverId, v]));

    /* Rows arrive newest-first, so the first hit per booking is its latest. */
    const latestMap = new Map<string, { lat: number; lng: number; heading?: number }>();
    for (const loc of latestLocs) {
      if (!latestMap.has(loc.bookingId)) {
        latestMap.set(loc.bookingId, { lat: loc.lat, lng: loc.lng, heading: loc.heading ?? undefined });
      }
    }

    const fmtDate = (d: Date) =>
      new Date(d).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    const vehicles = bookings
      .map((b) => {
        const d = b.driverId ? driverMap.get(b.driverId) : undefined;
        const v = b.driverId ? vehicleMap.get(b.driverId) : undefined;
        if (!d || !v) return null; /* no driver or no vehicle → not trackable */

        const live = latestMap.get(b.id);
        const hasLocationData = !!live;

        let status: "On Way" | "Active Trip" | "Returned";
        if (b.status === "COMPLETED") status = "Returned";
        else if (b.startedAt || hasLocationData) status = "Active Trip";
        else status = "On Way";

        const lat = live?.lat ?? d.lat ?? b.pickupLat ?? 0;
        const lng = live?.lng ?? d.lng ?? b.pickupLng ?? 0;

        return {
          id: b.id,
          client: b.clientName,
          car: `${v.make ?? "Unknown"} ${v.model ?? ""}`.trim(),
          carType: v.tier ?? "Unknown",
          carNumber: v.plate ?? "—",
          status,
          startDate: fmtDate(b.createdAt),
          endDate: fmtDate(b.updatedAt),
          tripTime: b.startedAt
            ? `Started ${new Date(b.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "—",
          distance: "—", /* computed from the trail, loaded per-vehicle on selection */
          pos: [lat, lng] as [number, number],
          route: [[lat, lng]] as [number, number][], /* seed; real trail loads on selection */
          heading: live?.heading ?? 0,
          driverName: `${d.firstName ?? "Unknown"} ${d.lastName ?? ""}`.trim(),
          /* URL, not the image bytes — see the photoUrl note above. */
          vehiclePhoto: v.hasPhoto ? `/api/admin/tracking/${b.id}/photo` : null,
          driverId: d.id,
          isOnline: d.isOnline ?? false,
          pickupLat: b.pickupLat ?? 0,
          pickupLng: b.pickupLng ?? 0,
          dropoffLat: b.dropoffLat ?? 0,
          dropoffLng: b.dropoffLng ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json(vehicles);
  } catch (e) {
    console.error("[admin-tracking]", e);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
