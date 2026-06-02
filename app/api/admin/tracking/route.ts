import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all active bookings with drivers
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        driverId: { not: null }, // Only show bookings with assigned drivers
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            lat: true,
            lng: true,
            isOnline: true,
            vehicle: {
              select: {
                make: true,
                model: true,
                plate: true,
                tier: true,
              },
            },
          },
        },
      },
    });

    // For active trips, batch-fetch their GPS trail (last 150 points each)
    const activeIds = bookings
      .filter(b => b.status === "CONFIRMED")
      .map(b => b.id);

    // Map: bookingId → chronological [lat,lng] trail
    const routeMap = new Map<string, [number, number][]>();
    const latestMap = new Map<string, { lat: number; lng: number; heading?: number; speed?: number }>();

    if (activeIds.length > 0) {
      // Fetch most-recent 150 points per active booking
      const locs = await prisma.tripLocation.findMany({
        where: { bookingId: { in: activeIds } },
        orderBy: { timestamp: "desc" },
        take: 150 * activeIds.length,
        select: { bookingId: true, lat: true, lng: true, heading: true, speed: true },
      });

      console.log(`[Admin Tracking] Found ${locs.length} location points for ${activeIds.length} active bookings`);

      // Group by bookingId (points arrive newest-first; cap at 150 per booking)
      for (const loc of locs) {
        if (!routeMap.has(loc.bookingId)) {
          routeMap.set(loc.bookingId, []);
          latestMap.set(loc.bookingId, {
            lat: loc.lat,
            lng: loc.lng,
            heading: loc.heading ?? undefined,
            speed: loc.speed ?? undefined,
          });
        }
        const arr = routeMap.get(loc.bookingId)!;
        if (arr.length < 150) arr.push([loc.lat, loc.lng]);
      }

      // Reverse so routes are chronological (oldest → newest)
      for (const [k, v] of routeMap) {
        routeMap.set(k, v.reverse());
      }
    }

    // Format response
    const vehicles = bookings.map(b => {
      const d = b.driver!;
      const v = d.vehicle!;
      const hasLocationData = latestMap.has(b.id);

      let tripStatus: "On Way" | "Active Trip" | "Returned";
      if (b.status === "COMPLETED") tripStatus = "Returned";
      else if (b.startedAt || hasLocationData) tripStatus = "Active Trip";
      else tripStatus = "On Way";

      // Live position: prefer latest TripLocation, fall back to Driver.lat/lng, fall back to booking coordinates
      const livePos = latestMap.get(b.id);
      const lat = livePos?.lat ?? d.lat ?? b.pickupLat ?? 0;
      const lng = livePos?.lng ?? d.lng ?? b.pickupLng ?? 0;
      const heading = livePos?.heading ?? 0;

      // Route trail: real GPS points for active trips, single-point otherwise
      const trail = routeMap.get(b.id) ?? [[lat, lng]];

      return {
        id: b.id,
        client: b.clientName,
        car: `${v.make} ${v.model}`,
        carType: v.tier,
        carNumber: v.plate,
        status: tripStatus,
        startDate: new Date(b.createdAt).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        endDate: new Date(b.updatedAt).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        tripTime: b.startedAt
          ? `Started ${new Date(b.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "—",
        distance: "—",
        pos: [lat, lng] as [number, number],
        route: trail,
        heading,
        driverName: `${d.firstName} ${d.lastName}`,
        driverId: d.id,
        isOnline: d.isOnline,
        pickupLat: b.pickupLat,
        pickupLng: b.pickupLng,
        dropoffLat: b.dropoffLat,
        dropoffLng: b.dropoffLng,
      };
    });

    return NextResponse.json(vehicles);
  } catch (e) {
    console.error("Admin tracking error:", e);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
