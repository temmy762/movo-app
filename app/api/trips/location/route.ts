import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getSessionFromCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
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
    if (!driverId && !isSimulation) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, lat, lng, heading, speed } = body;

    if (!bookingId || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "bookingId, lat, lng required" }, { status: 400 });
    }

    // Verify booking exists and has acceptable status
    const booking = await prisma.booking.findFirst({
      where: {
        id:     bookingId,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(isSimulation ? {} : { driverId }), // Only check driverId if not simulating
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "No active booking found" }, { status: 404 });
    }

    // Write location snapshot only (no driver update in simulation)
    await prisma.tripLocation.create({
      data: {
        bookingId,
        lat,
        lng,
        heading: typeof heading === "number" ? heading : null,
        speed:   typeof speed   === "number" ? speed   : null,
      },
    });
    
    // Only update driver position if we have a valid driverId (non-simulation)
    if (driverId && !isSimulation) {
      await prisma.driver.update({
        where: { id: driverId },
        data:  { lat, lng },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
