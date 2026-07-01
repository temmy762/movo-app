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

    /* Fetch the co-driver's active assignment on the same booking so each
       driver can see the other's status (name, role, status, vehicle). */
    let coDriver: {
      id: string;
      role: "PRIMARY" | "SUPPORT";
      status: string;
      driver: { id: string; firstName: string; lastName: string; phone: string | null; photoUrl: string | null; vehicle: { make: string | null; model: string | null; plate: string | null } | null };
    } | null = null;

    if (assignment) {
      const co = await prisma.careAssignment.findFirst({
        where: {
          bookingId: assignment.bookingId,
          id: { not: assignment.id },
          role: assignment.role === "PRIMARY" ? "SUPPORT" : "PRIMARY",
          status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
        },
        include: {
          driver: {
            select: {
              id: true, firstName: true, lastName: true, phone: true, photoUrl: true,
              vehicle: { select: { make: true, model: true, plate: true } },
            },
          },
        },
      });
      if (co) {
        coDriver = {
          id: co.id,
          role: co.role as "PRIMARY" | "SUPPORT",
          status: co.status,
          driver: {
            id: co.driver.id,
            firstName: co.driver.firstName,
            lastName: co.driver.lastName,
            phone: co.driver.phone,
            photoUrl: co.driver.photoUrl,
            vehicle: co.driver.vehicle
              ? { make: co.driver.vehicle.make, model: co.driver.vehicle.model, plate: co.driver.vehicle.plate }
              : null,
          },
        };
      }
    }

    return NextResponse.json({ assignment: assignment ?? null, coDriver });
  } catch (e) {
    console.error("[care driver GET]", e);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
