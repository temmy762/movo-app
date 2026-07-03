/**
 * PATCH /api/care/assignments/[id]
 *
 * Drivers call this to update assignment status.
 * Accepted transitions:
 *   PENDING    → ACCEPTED   (driver accepts)
 *   PENDING    → CANCELLED  (driver declines)
 *   ACCEPTED   → ARRIVED
 *   ARRIVED    → STARTED
 *   STARTED    → COMPLETED
 *   any active → CANCELLED  (admin force-cancel or driver cancels)
 *
 * Side-effects:
 *   PRIMARY  ACCEPTED  → triggers SUPPORT dispatch
 *   SUPPORT  ACCEPTED  → cancels all other SUPPORT PENDING for same booking
 *   PRIMARY  COMPLETED → checks if SUPPORT is also COMPLETED → closes booking
 *   SUPPORT  COMPLETED → checks if PRIMARY is also COMPLETED → closes booking
 *   any      CANCELLED → re-dispatch if no other active assignment of same role
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchSupport } from "@/lib/care/dispatch";
import {
  dispatchCarePrimaryAccepted,
  dispatchCareSupportAccepted,
  dispatchCareAssignmentStatus,
  dispatchCareBookingConfirmed,
  dispatchCareBookingClosed,
  dispatchDriverArrived,
} from "@/lib/socket/dispatcher";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ["ACCEPTED", "CANCELLED"],
  ACCEPTED:  ["ARRIVED",  "CANCELLED"],
  ARRIVED:   ["STARTED",  "CANCELLED"],
  STARTED:   ["COMPLETED","CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session  = await getSession(req);
    const body     = await req.json() as { status: string };
    const newStatus = body.status?.toUpperCase();

    const assignment = await prisma.careAssignment.findUnique({
      where: { id },
      include: { booking: true, driver: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    /* Auth: only the assigned driver or an admin may update */
    const isAdmin  = session?.role === "ADMIN";
    const isDriver = session?.driverId && assignment.driverId === session.driverId;
    if (!isAdmin && !isDriver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* Validate transition */
    const allowed = VALID_TRANSITIONS[assignment.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${assignment.status} to ${newStatus}` },
        { status: 422 },
      );
    }

    /* Timestamp field for the new status */
    const timestampField: Record<string, string> = {
      ACCEPTED:  "acceptedAt",
      ARRIVED:   "arrivedAt",
      STARTED:   "startedAt",
      COMPLETED: "completedAt",
      CANCELLED: "cancelledAt",
    };

    const updated = await prisma.careAssignment.update({
      where: { id },
      data: {
        status: newStatus as never,
        ...(timestampField[newStatus] ? { [timestampField[newStatus]]: new Date() } : {}),
      },
    });

    const booking  = assignment.booking;
    const driver   = assignment.driver;
    const userId   = booking.userId ?? null;
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : "Chauffeur";

    /* ── Side-effects ─────────────────────────────────────────────────────── */

    if (newStatus === "ACCEPTED" && assignment.role === "PRIMARY") {
      dispatchCarePrimaryAccepted({
        bookingId: booking.id, assignmentId: id,
        driverId: driver!.id, driverName, userId,
      });

      /* Trigger SUPPORT dispatch from the dropoff location (null if geocoding failed) */
      dispatchSupport(
        booking.id,
        booking.dropoffLat ?? null,
        booking.dropoffLng ?? null,
        userId,
        [driver!.id],
      ).catch((e) => console.error("[care dispatch support]", e));
    }

    if (newStatus === "ACCEPTED" && assignment.role === "SUPPORT") {
      /* Cancel all other PENDING SUPPORT assignments for this booking */
      await prisma.careAssignment.updateMany({
        where: {
          bookingId: booking.id,
          role:      "SUPPORT",
          status:    "PENDING",
          id:        { not: id },
        },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      dispatchCareSupportAccepted({
        bookingId: booking.id, assignmentId: id,
        driverId: driver!.id, driverName, userId,
      });

      /* Both drivers are now secured — confirm the booking */
      const primaryAccepted = await prisma.careAssignment.findFirst({
        where: {
          bookingId: booking.id,
          role:      "PRIMARY",
          status:    { in: ["ACCEPTED", "ARRIVED", "STARTED"] },
        },
      });
      if (primaryAccepted) {
        await prisma.booking.update({
          where: { id: booking.id },
          data:  { status: "CONFIRMED" },
        });
        dispatchCareBookingConfirmed({ bookingId: booking.id, userId });
      }
    }

    /* Emit DRIVER_ARRIVED for primary Care driver so the customer banner fires */
    if (newStatus === "ARRIVED" && assignment.role === "PRIMARY") {
      dispatchDriverArrived({
        bookingId: booking.id,
        userId,
        driverId: driver?.id ?? null,
      });
    }

    /* Gate: PRIMARY driver cannot START until a SUPPORT assignment is active */
    if (newStatus === "STARTED" && assignment.role === "PRIMARY") {
      const supportActive = await prisma.careAssignment.findFirst({
        where: {
          bookingId: booking.id,
          role:      "SUPPORT",
          status:    { in: ["ACCEPTED", "ARRIVED", "STARTED"] },
        },
      });
      if (!supportActive) {
        return NextResponse.json(
          { error: "Cannot start: Support chauffeur has not yet accepted" },
          { status: 422 },
        );
      }
    }

    if (newStatus === "COMPLETED") {
      const siblings = await prisma.careAssignment.findMany({
        where: { bookingId: booking.id, id: { not: id } },
      });

      const allDone = siblings.every(
        (s) => s.status === "COMPLETED" || s.status === "CANCELLED",
      );

      if (allDone) {
        await prisma.booking.update({
          where: { id: booking.id },
          data:  { status: "COMPLETED", completedAt: new Date() },
        });
        dispatchCareBookingClosed({ bookingId: booking.id, userId });

        /* ── Credit chauffeur earnings — Safe Ride previously never credited
           anyone. Commission comes from the dedicated "care" pricing config;
           the net is split evenly between PRIMARY and SUPPORT (adjust
           CARE_PRIMARY_SHARE if the business wants a different split). */
        const CARE_PRIMARY_SHARE = 0.5;
        if (booking.paymentStatus === "PAID" && booking.fare > 0) {
          const alreadyCredited = await prisma.walletTransaction.findFirst({
            where: { type: "EARNING", note: { contains: `Care Ride — booking ${booking.id}` } },
            select: { id: true },
          });
          if (!alreadyCredited) {
            const careConfig = await prisma.vehicleTierConfig.findFirst({
              where: { tier: { equals: "care", mode: "insensitive" } },
              select: { commissionRate: true },
            }).catch(() => null);
            const commission = careConfig?.commissionRate ?? 0.20;
            const net = booking.fare * (1 - commission);

            const completedAssignments = [updated, ...siblings].filter(
              (a) => a.status === "COMPLETED" && a.driverId,
            );
            const primaryDone = completedAssignments.find((a) => a.role === "PRIMARY");
            const supportDone = completedAssignments.find((a) => a.role === "SUPPORT");

            const credits: { driverId: string; amount: number; role: string }[] = [];
            if (primaryDone?.driverId && supportDone?.driverId) {
              credits.push(
                { driverId: primaryDone.driverId, amount: net * CARE_PRIMARY_SHARE, role: "PRIMARY" },
                { driverId: supportDone.driverId, amount: net * (1 - CARE_PRIMARY_SHARE), role: "SUPPORT" },
              );
            } else if (primaryDone?.driverId) {
              /* Support role cancelled/never filled — primary keeps the full net */
              credits.push({ driverId: primaryDone.driverId, amount: net, role: "PRIMARY" });
            }

            await Promise.all(
              credits.map((c) =>
                prisma.walletTransaction.create({
                  data: {
                    driverId: c.driverId,
                    type:     "EARNING",
                    status:   "COMPLETED",
                    amount:   parseFloat(c.amount.toFixed(2)),
                    note:     `${c.role} earning, Care Ride — booking ${booking.id} (${Math.round(commission * 100)}% platform fee)`,
                  },
                }),
              ),
            ).catch((e) => console.error("[care earnings credit]", e));
          }
        }
      }
    }

    if (newStatus === "CANCELLED") {
      /* Re-dispatch if there is no other active assignment of the same role */
      const activeForRole = await prisma.careAssignment.findFirst({
        where: {
          bookingId: booking.id,
          role:      assignment.role,
          status:    { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
          id:        { not: id },
        },
      });

      if (!activeForRole) {
        /* Collect every driver ever used for this role to exclude from retry */
        const usedDriverIds = (
          await prisma.careAssignment.findMany({
            where: { bookingId: booking.id, role: assignment.role },
            select: { driverId: true },
          })
        ).map((a) => a.driverId).filter(Boolean) as string[];

        if (assignment.role === "PRIMARY") {
          const { dispatchPrimary } = await import("@/lib/care/dispatch");
          dispatchPrimary(
            booking.id,
            booking.pickupLat ?? null,
            booking.pickupLng ?? null,
            userId, usedDriverIds,
          ).catch(() => {});
        }
        if (assignment.role === "SUPPORT") {
          dispatchSupport(
            booking.id,
            booking.dropoffLat ?? null,
            booking.dropoffLng ?? null,
            userId, usedDriverIds,
          ).catch(() => {});
        }
      }
    }

    /* Always emit generic status event */
    dispatchCareAssignmentStatus({
      bookingId:    booking.id,
      assignmentId: id,
      role:         assignment.role,
      status:       newStatus,
      driverId:     driver?.id ?? null,
      userId,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[care assignment PATCH]", e);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}
