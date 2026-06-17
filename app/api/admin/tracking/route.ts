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
                photoUrl: true,
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

    // Format response - filter out invalid bookings
    const vehicles = bookings
      .filter(b => {
        // Skip if no driver
        if (!b.driver) {
          console.warn(`[Admin Tracking] Booking ${b.id} has no driver assigned`);
          return false;
        }
        // Skip if driver has no vehicle
        if (!b.driver.vehicle) {
          console.warn(`[Admin Tracking] Booking ${b.id} (driver: ${b.driver.id}) has no vehicle assigned`);
          return false;
        }
        return true;
      })
      .map(b => {
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
          car: `${v.make ?? "Unknown"} ${v.model ?? ""}`.trim(),
          carType: v.tier ?? "Unknown",
          carNumber: v.plate ?? "—",
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
          distance: (() => {
          const pts = routeMap.get(b.id);
          if (!pts || pts.length < 2) return "—";
          let km = 0;
          for (let i = 1; i < pts.length; i++) {
            const [lat1, lng1] = pts[i - 1];
            const [lat2, lng2] = pts[i];
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
            km += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          }
          return km < 1 ? `${(km*1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
        })(),
          pos: [lat, lng] as [number, number],
          route: trail,
          heading,
          driverName: `${d.firstName ?? "Unknown"} ${d.lastName ?? ""}`.trim(),
          vehiclePhoto: v.photoUrl ?? null,
          driverId: d.id,
          isOnline: d.isOnline ?? false,
          pickupLat: b.pickupLat ?? 0,
          pickupLng: b.pickupLng ?? 0,
          dropoffLat: b.dropoffLat ?? 0,
          dropoffLng: b.dropoffLng ?? 0,
        };
      });

    return NextResponse.json(vehicles);
  } catch (e) {
    console.error("Admin tracking error:", e);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
