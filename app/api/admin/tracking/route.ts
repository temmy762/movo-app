import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        driver: {
          select: {
            id: true, firstName: true, lastName: true,
            lat: true, lng: true, isOnline: true,
            vehicle: { select: { make: true, model: true, plate: true, tier: true } },
          },
        },
      },
    });

    // Show bookings with drivers OR bookings with location data (simulations)
    const filtered = bookings.filter(b => b.driver?.vehicle || b.driverId === null);

    // For active trips, batch-fetch their GPS trail (last 150 points each)
    // Include all CONFIRMED bookings (with or without startedAt) to support simulations
    const activeIds = filtered
      .filter(b => b.status === "CONFIRMED")
      .map(b => b.id);

    // Map: bookingId → chronological [lat,lng] trail
    const routeMap = new Map<string, [number, number][]>();
    const latestMap = new Map<string, { lat: number; lng: number }>();

    if (activeIds.length > 0) {
      // Fetch most-recent 150 points per active booking
      const locs = await prisma.tripLocation.findMany({
        where:   { bookingId: { in: activeIds } },
        orderBy: { timestamp: "desc" },
        take:    150 * activeIds.length,
        select:  { bookingId: true, lat: true, lng: true },
      });
      
      console.log(`[Tracking] Found ${locs.length} location points for ${activeIds.length} active bookings`);

      // Group by bookingId (points arrive newest-first; cap at 150 per booking)
      for (const loc of locs) {
        if (!routeMap.has(loc.bookingId)) {
          routeMap.set(loc.bookingId, []);
          latestMap.set(loc.bookingId, { lat: loc.lat, lng: loc.lng });
        }
        const arr = routeMap.get(loc.bookingId)!;
        if (arr.length < 150) arr.push([loc.lat, loc.lng]);
      }

      // Reverse so routes are chronological (oldest → newest)
      for (const [k, v] of routeMap) routeMap.set(k, v.reverse());
    }

    const vehicles = filtered.map(b => {
      const d = b.driver;
      const v = d?.vehicle;
      const hasLocationData = latestMap.has(b.id);

      let tripStatus: "On Way" | "Active Trip" | "Returned";
      if (b.status === "COMPLETED")     tripStatus = "Returned";
      else if (b.startedAt || hasLocationData)  tripStatus = "Active Trip";
      else                              tripStatus = "On Way";

      // Live position: prefer latest TripLocation, fall back to Driver.lat/lng
      const livePos    = latestMap.get(b.id);
      const lat        = livePos?.lat ?? d?.lat ?? 34.0522;
      const lng        = livePos?.lng ?? d?.lng ?? -118.2437;

      // Route trail: real GPS points for active trips, single-point otherwise
      const trail      = routeMap.get(b.id) ?? [[lat, lng]] as [number, number][];

      return {
        id:         b.id,
        client:     b.clientName,
        car:        v ? `${v.make} ${v.model}` : b.carName,
        carType:    v?.tier ?? b.carTier,
        carNumber:  v?.plate ?? "SIM-001",
        status:     tripStatus,
        startDate:  new Date(b.createdAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
        endDate:    new Date(b.updatedAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
        tripTime:   b.startedAt ? `Started ${new Date(b.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "—",
        distance:   "—",
        pos:        [lat, lng] as [number, number],
        route:      trail,
        driverName: d ? `${d.firstName} ${d.lastName}` : "Simulator",
      };
    });

    return NextResponse.json(vehicles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
