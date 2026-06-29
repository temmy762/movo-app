/**
 * GET /api/care/driver
 * Returns the authenticated driver's active CareAssignment (if any).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    const driverId = session?.driverId;
    if (!driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignment = await prisma.careAssignment.findFirst({
      where: {
        driverId,
        status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
      },
      include: {
        booking: {
          select: {
            id: true,
            clientName: true,
            pickup: true,
            dropoff: true,
            pickupLat: true,
            pickupLng: true,
            dropoffLat: true,
            dropoffLng: true,
            carName: true,
            total: true,
            paymentStatus: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignment: assignment ?? null });
  } catch (e) {
    console.error("[care driver GET]", e);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
