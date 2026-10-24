/**
 * POST /api/socket/authorize  { bookingId?, tier? }
 *
 * Called by server.js on every socket "join" — returns only the rooms the
 * caller's session may receive events from. Before this, any client could
 * join "admin", another chauffeur's room or any booking room unauthenticated.
 *   ADMIN  → admin, any booking
 *   DRIVER → driver:<own id>, tier:<own vehicle tier>, bookings they drive
 *   USER   → user:<own id>, their own bookings
 * Session comes from the web cookie or, for the mobile apps, a Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ rooms: [] });

    const { bookingId, tier } = await req.json().catch(() => ({}));
    const rooms: string[] = [];

    if (session.role === "ADMIN") rooms.push("admin");
    if (session.userId) rooms.push(`user:${session.userId}`);
    if (session.driverId) {
      rooms.push(`driver:${session.driverId}`);
      if (typeof tier === "string" && tier) {
        const driver = await prisma.driver.findUnique({
          where: { id: session.driverId },
          select: { vehicle: { select: { tier: true } } },
        });
        if (driver?.vehicle?.tier === tier) rooms.push(`tier:${tier}`);
      }
    }

    if (typeof bookingId === "string" && bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          userId: true, driverId: true, recoveryDriverId: true,
          careAssignments: { select: { driverId: true } },
        },
      });
      const allowed = !!booking && (
        session.role === "ADMIN" ||
        (!!session.userId && booking.userId === session.userId) ||
        (!!session.driverId && (
          booking.driverId === session.driverId ||
          booking.recoveryDriverId === session.driverId ||
          booking.careAssignments.some((a) => a.driverId === session.driverId)
        ))
      );
      if (allowed) rooms.push(`booking:${bookingId}`);
    }

    return NextResponse.json({ rooms }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[socket-authorize]", e);
    return NextResponse.json({ rooms: [] }, { status: 500 });
  }
}
