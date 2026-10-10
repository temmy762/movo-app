/**
 * GET /api/care/driver
 * Returns the authenticated driver's active CareAssignment (if any).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { safeRideEarningFor } from "@/lib/earnings";

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
        /* AWAITING_RETURN keeps PRIMARY on the job after the customer is
           delivered, until SUPPORT returns them to their parked vehicle. */
        status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"] },
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
            fare: true,
            total: true,
            paymentStatus: true,
            status: true,
            primaryReadyLat: true,
            primaryReadyLng: true,
            /* Payout inputs + the Uber return leg (chauffeur sees the booking
               reference, not what Movo paid for it) */
            chauffeurPayout: true,
            waitingFee: true,
            pricingSnapshot: true,
            returnMode: true,
            uberReturnRef: true,
            uberReturnBookedAt: true,
            /* Reservation timing + what the chauffeur needs at pickup */
            scheduledAt: true,
            enRouteAt: true,
            riderPhone: true,
            passengers: true,
            pickupInstructions: true,
            stops: true,
            careVehicle: true,
            user: { select: { phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    /* Fetch the co-driver's assignment on the same booking so each driver can
       see the other's status (name, role, status, vehicle). COMPLETED is
       included (not just the "still active" statuses) so a SUPPORT chauffeur
       waiting at the destination can see the moment PRIMARY completes and
       they're cleared to start the return leg. */
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
          status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] },
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

    /* This chauffeur's Safe Ride payout — shown before they accept, and the
       exact amount credited when their part of the job is done */
    const earning = assignment?.booking
      ? await safeRideEarningFor(assignment.booking, assignment.role as "PRIMARY" | "SUPPORT")
      : 0;

    /* Strip internal pricing fields before sending to the chauffeur */
    const safeAssignment = assignment
      ? {
          ...assignment,
          booking: { ...assignment.booking, chauffeurPayout: undefined, pricingSnapshot: undefined, waitingFee: undefined, fare: undefined },
        }
      : null;

    return NextResponse.json({ assignment: safeAssignment, coDriver, earning });
  } catch (e) {
    console.error("[care driver GET]", e);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
