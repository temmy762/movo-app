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
 * PRIMARY drives the customer + their car to the destination (ACCEPTED →
 * ARRIVED at pickup → STARTED the ride → COMPLETED at destination). SUPPORT
 * drives straight to the destination and waits (ACCEPTED → ARRIVED); once
 * PRIMARY is COMPLETED, SUPPORT is cleared to pick them up and drive them
 * back to the original pickup — that's SUPPORT's own STARTED → COMPLETED.
 *
 * Side-effects:
 *   PRIMARY  ACCEPTED  → triggers SUPPORT dispatch
 *   SUPPORT  ACCEPTED  → cancels all other SUPPORT PENDING for same booking
 *   PRIMARY  COMPLETED → captures PRIMARY's location, notifies SUPPORT they're
 *                        clear to start the return leg
 *   SUPPORT  STARTED   → gated on PRIMARY being COMPLETED first
 *   PRIMARY/SUPPORT COMPLETED → checks if the other is also COMPLETED/CANCELLED
 *                        → closes booking + credits earnings
 *   any      CANCELLED → re-dispatch if no other active assignment of same role
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchSupport } from "@/lib/care/dispatch";
import { creditSafeRideEarning } from "@/lib/earnings";
import { sendNotification, notifyAdmins } from "@/lib/notifications";
import {
  dispatchCarePrimaryAccepted,
  dispatchCareSupportAccepted,
  dispatchCareAssignmentStatus,
  dispatchCareBookingConfirmed,
  dispatchCareBookingClosed,
  dispatchDriverArrived,
  dispatchTripStarted,
  dispatchCareSupportPickupReady,
  dispatchCarePrimaryPickupEnRoute,
} from "@/lib/socket/dispatcher";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ["ACCEPTED", "CANCELLED"],
  ACCEPTED:  ["ARRIVED",  "CANCELLED"],
  ARRIVED:   ["STARTED",  "CANCELLED"],
  /* PRIMARY goes STARTED → AWAITING_RETURN when the customer is delivered.
     SUPPORT goes STARTED → COMPLETED when it has returned PRIMARY to their car. */
  STARTED:   ["AWAITING_RETURN", "COMPLETED", "CANCELLED"],
  /* PRIMARY is stranded at the destination here; only the return leg closes it.
     No CANCELLED — the customer's trip is already done and paid. */
  AWAITING_RETURN: ["COMPLETED"],
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
      /* Friendlier message for the common case: the batch window expired and
         the assignment was auto-cancelled before the driver tapped Accept. */
      if (newStatus === "ACCEPTED" && assignment.status === "CANCELLED") {
        return NextResponse.json(
          { error: "This request has expired. New requests will appear automatically." },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: `Cannot transition from ${assignment.status} to ${newStatus}` },
        { status: 422 },
      );
    }

    /* First-accept-wins: if another chauffeur already holds this role on the
       booking, this accept loses. (Previously only SUPPORT cancelled rivals,
       and neither role guarded against a second acceptance.) */
    if (newStatus === "ACCEPTED") {
      const rival = await prisma.careAssignment.findFirst({
        where: {
          bookingId: assignment.bookingId,
          role:      assignment.role,
          id:        { not: id },
          status:    { in: ["ACCEPTED", "ARRIVED", "STARTED"] },
        },
        select: { id: true },
      });
      if (rival) {
        return NextResponse.json(
          { error: "Another chauffeur accepted this request first." },
          { status: 409 },
        );
      }
    }

    /* Timestamp field for the new status */
    const timestampField: Record<string, string> = {
      ACCEPTED:  "acceptedAt",
      ARRIVED:   "arrivedAt",
      STARTED:   "startedAt",
      COMPLETED: "completedAt",
      CANCELLED: "cancelledAt",
    };

    /* Atomic: condition the write on the status we validated against, so a
       concurrent timeout-cancel or rival accept can't be clobbered. */
    const writeResult = await prisma.careAssignment.updateMany({
      where: { id, status: assignment.status as never },
      data: {
        status: newStatus as never,
        ...(timestampField[newStatus] ? { [timestampField[newStatus]]: new Date() } : {}),
      },
    });
    if (writeResult.count === 0) {
      return NextResponse.json(
        { error: "This request has expired. New requests will appear automatically." },
        { status: 409 },
      );
    }
    const updated = (await prisma.careAssignment.findUnique({ where: { id } }))!;

    const booking  = assignment.booking;
    const driver   = assignment.driver;
    const userId   = booking.userId ?? null;
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : "Chauffeur";

    /* ── Side-effects ─────────────────────────────────────────────────────── */

    if (newStatus === "ACCEPTED" && assignment.role === "PRIMARY") {
      /* First-accept-wins cleanup: cancel every other still-PENDING PRIMARY
         offer for this booking so no second chauffeur can accept it. */
      await prisma.careAssignment.updateMany({
        where: {
          bookingId: booking.id,
          role:      "PRIMARY",
          status:    "PENDING",
          id:        { not: id },
        },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

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

      /* Stamp the BOOKING as started and announce it. Without this the
         customer's tracking screen never leaves "on the way" — it flips to
         "Ride in progress" on TRIP_STARTED, which nothing was emitting for
         Safe Ride. Also keeps admin in sync in real time.

         Mirrors the normal-ride flow (app/api/bookings/[id]/start): status
         stays CONFIRMED and "started" is represented by startedAt — there is
         no STARTED member of the BookingStatus enum. */
      const startedAt = booking.startedAt ?? new Date();
      if (!booking.startedAt) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { startedAt },
        });
      }
      dispatchTripStarted({
        bookingId: booking.id,
        userId,
        driverId: driver?.id ?? null,
        startedAt: startedAt.toISOString(),
      });
    }

    /* Gate: SUPPORT cannot pick up PRIMARY (the return leg) until PRIMARY has
       completed the customer trip — this is what "STARTED" now means for the
       SUPPORT role, instead of a second, independent trip. Once cleared,
       let PRIMARY know Support is on the way to collect them. */
    if (newStatus === "STARTED" && assignment.role === "SUPPORT") {
      /* AWAITING_RETURN, not COMPLETED — PRIMARY's assignment deliberately stays
         open through the return leg and only completes once SUPPORT delivers
         them back to their vehicle. */
      const primaryDone = await prisma.careAssignment.findFirst({
        where: { bookingId: booking.id, role: "PRIMARY", status: "AWAITING_RETURN" },
        select: { driverId: true },
      });
      if (!primaryDone) {
        return NextResponse.json(
          { error: "Cannot start pickup: Primary chauffeur has not delivered the customer yet" },
          { status: 422 },
        );
      }
      if (primaryDone.driverId) {
        sendNotification({
          eventType: "CHAUFFEUR_CARE_SUPPORT_EN_ROUTE",
          recipient: { type: "driver", id: primaryDone.driverId },
          data: { bookingId: booking.id },
        }).catch((e) => console.error("[care support-en-route notify]", e));

        dispatchCarePrimaryPickupEnRoute({
          bookingId: booking.id,
          primaryDriverId: primaryDone.driverId,
        });
      }
    }

    /* PRIMARY has dropped the customer and car off. The customer's trip is over
       — close the BOOKING so they get their receipt and rating immediately —
       but PRIMARY's own assignment stays open (AWAITING_RETURN) because they're
       stranded at the destination until SUPPORT returns them to their car.
       Capture where they are (last live GPS ping — they may have drifted from
       the exact dropoff pin) and alert the active SUPPORT assignment. */
    if (newStatus === "AWAITING_RETURN" && assignment.role === "PRIMARY") {
      const lastPing = await prisma.tripLocation.findFirst({
        where: { bookingId: booking.id },
        orderBy: { timestamp: "desc" },
        select: { lat: true, lng: true },
      });
      const readyLat = lastPing?.lat ?? booking.dropoffLat ?? null;
      const readyLng = lastPing?.lng ?? booking.dropoffLng ?? null;

      /* Customer-facing completion happens HERE, not when the whole Safe Ride
         operation closes. The return leg is internal and the customer must not
         be made to wait on it for their receipt or rating. */
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          primaryReadyLat: readyLat, primaryReadyLng: readyLng, primaryReadyAt: new Date(),
          status: "COMPLETED", completedAt: new Date(),
        },
      });
      dispatchCareBookingClosed({ bookingId: booking.id, userId });

      const activeSupport = await prisma.careAssignment.findFirst({
        where: { bookingId: booking.id, role: "SUPPORT", status: { in: ["ACCEPTED", "ARRIVED"] } },
        select: { driverId: true },
      });
      if (activeSupport?.driverId) {
        sendNotification({
          eventType: "CHAUFFEUR_CARE_PICKUP_READY",
          recipient: { type: "driver", id: activeSupport.driverId },
          data: { bookingId: booking.id },
        }).catch((e) => console.error("[care pickup-ready notify]", e));

        dispatchCareSupportPickupReady({
          bookingId: booking.id,
          supportDriverId: activeSupport.driverId,
          lat: readyLat,
          lng: readyLng,
        });
      }
    }

    /* SUPPORT has returned PRIMARY to their parked vehicle — that closes
       PRIMARY's assignment too. Without this PRIMARY would sit in
       AWAITING_RETURN forever and never be released for new dispatch. */
    if (newStatus === "COMPLETED" && assignment.role === "SUPPORT") {
      await prisma.careAssignment.updateMany({
        where: { bookingId: booking.id, role: "PRIMARY", status: "AWAITING_RETURN" },
        data:  { status: "COMPLETED", completedAt: new Date() },
      });
    }

    if (newStatus === "COMPLETED") {
      const siblings = await prisma.careAssignment.findMany({
        where: { bookingId: booking.id, id: { not: id } },
      });

      const allDone = siblings.every(
        (s) => s.status === "COMPLETED" || s.status === "CANCELLED",
      );

      if (allDone) {
        /* The booking was already closed for the customer when PRIMARY reached
           AWAITING_RETURN; only stamp it if that never happened (e.g. the
           PRIMARY role was cancelled and SUPPORT closed things out). */
        if (booking.status !== "COMPLETED") {
          await prisma.booking.update({
            where: { id: booking.id },
            data:  { status: "COMPLETED", completedAt: new Date() },
          });
          dispatchCareBookingClosed({ bookingId: booking.id, userId });
        }

      }
    }

    /* ── Earnings ──────────────────────────────────────────────────────────
       Each role is credited when ITS OWN work is done, not when the whole
       operation closes:
         PRIMARY  → on AWAITING_RETURN (customer + vehicle delivered), so their
                    pay never depends on the internal return leg succeeding.
         SUPPORT  → on COMPLETED (PRIMARY returned to their parked car).
       Both are idempotent per-role, so replays and retries are safe. */
    if (newStatus === "AWAITING_RETURN" && assignment.role === "PRIMARY") {
      creditSafeRideEarning(booking.id, "PRIMARY")
        .catch((e) => console.error("[safe-ride earnings PRIMARY]", e));
    }
    if (newStatus === "COMPLETED" && assignment.role === "SUPPORT") {
      creditSafeRideEarning(booking.id, "SUPPORT")
        .catch((e) => console.error("[safe-ride earnings SUPPORT]", e));
    }
    /* A PRIMARY that completes without ever passing through AWAITING_RETURN
       (legacy rows, or an admin force-completing) still gets paid. */
    if (newStatus === "COMPLETED" && assignment.role === "PRIMARY") {
      creditSafeRideEarning(booking.id, "PRIMARY")
        .catch((e) => console.error("[safe-ride earnings PRIMARY]", e));
    }

    if (newStatus === "CANCELLED") {
      /* Re-dispatch if there is no other active assignment of the same role */
      const activeForRole = await prisma.careAssignment.findFirst({
        where: {
          bookingId: booking.id,
          role:      assignment.role,
          status:    { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"] },
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
          /* If PRIMARY is already waiting at the destination, losing SUPPORT
             leaves a real person stranded with no car. Search for a
             replacement automatically AND raise it to Admin, who can dispatch
             someone manually from the Safe Ride panel if the search fails. */
          const strandedPrimary = await prisma.careAssignment.findFirst({
            where: { bookingId: booking.id, role: "PRIMARY", status: "AWAITING_RETURN" },
            include: { driver: { select: { firstName: true, lastName: true, phone: true } } },
          });

          if (strandedPrimary) {
            const pName = strandedPrimary.driver
              ? `${strandedPrimary.driver.firstName} ${strandedPrimary.driver.lastName}`
              : "A chauffeur";
            notifyAdmins(
              "ADMIN_CARE_SUPPORT_STRANDED",
              {
                bookingId: booking.id,
                title: "Safe Ride: chauffeur awaiting pickup",
                message:
                  `${pName} has delivered the customer on booking ${booking.id.slice(0, 8)} ` +
                  `but their support chauffeur dropped off. A replacement search has started ` +
                  `automatically — dispatch one manually if it doesn't fill.` +
                  (strandedPrimary.driver?.phone ? ` Contact: ${strandedPrimary.driver.phone}` : ""),
              },
              ["IN_APP", "SMS"],
            ).catch((e) => console.error("[safe-ride stranded alert]", e));
          }

          dispatchSupport(
            booking.id,
            /* Target where PRIMARY actually is when they're already waiting —
               they may not be exactly on the customer's dropoff pin. */
            strandedPrimary ? (booking.primaryReadyLat ?? booking.dropoffLat ?? null) : (booking.dropoffLat ?? null),
            strandedPrimary ? (booking.primaryReadyLng ?? booking.dropoffLng ?? null) : (booking.dropoffLng ?? null),
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
