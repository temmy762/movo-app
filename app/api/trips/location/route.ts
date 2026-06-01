import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getSessionFromCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Check for simulation mode
  const isSimulation = req.headers.get("X-Simulation-Mode") === "true";
  
  let session = await getSession(req);
  let driverId: string | null = null;
  
  // If no session from cookies, try header token
  if (!session?.driverId) {
    const headerToken = req.headers.get("X-Session-Token");
    if (headerToken) {
      session = await getSessionFromCookieHeader(`movo_session=${headerToken}`);
    }
  }
  
  if (session?.driverId) {
    driverId = session.driverId;
  }
  
  // In simulation mode, we can proceed without a real driver session
  // but we'll still try to use the driver's ID if available
  if (!driverId && !isSimulation) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bookingId, lat, lng, heading, speed } = body;

  if (!bookingId || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "bookingId, lat, lng required" }, { status: 400 });
  }

  // Verify booking belongs to this driver and is active
  const booking = await prisma.booking.findFirst({
    where: {
      id:       bookingId,
      driverId: session.driverId,
      status:   { in: ["CONFIRMED", "ONGOING", "ACTIVE", "IN_PROGRESS"] },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "No active booking found" }, { status: 404 });
  }

  // Write location snapshot + update driver's live position in parallel
  await Promise.all([
    prisma.tripLocation.create({
      data: {
        bookingId,
        lat,
        lng,
        heading: typeof heading === "number" ? heading : null,
        speed:   typeof speed   === "number" ? speed   : null,
      },
    }),
    prisma.driver.update({
      where: { id: session.driverId },
      data:  { lat, lng },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
