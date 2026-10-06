/**
 * GET  /api/admin/care        — paginated list of all CARE bookings
 * PATCH /api/admin/care       — admin force-action on a booking
 *   body: { bookingId, action: "force_complete" | "cancel" | "replace_driver" | "create_assignment"
 *                              | "set_return_mode" | "record_uber_return" | "mark_returned" }
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pushToDriver } from "@/lib/webpush";
import { dispatchSupport } from "@/lib/care/dispatch";
import { creditSafeRideEarning } from "@/lib/earnings";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/auditLog";
import { dispatchCareBookingClosed, dispatchCareAssignmentStatus, dispatchCarePrimaryDispatched, dispatchCareSupportDispatched } from "@/lib/socket/dispatcher";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status");

    const where = {
      bookingType: "CARE" as const,
      ...(status ? { status: status as never } : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          careAssignments: {
            include: {
              driver: {
                select: {
                  id: true, firstName: true, lastName: true, phone: true, photoUrl: true,
                  vehicle: { select: { make: true, model: true, plate: true, tier: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (e) {
    console.error("[admin care GET]", e);
    return NextResponse.json({ error: "Failed to fetch Care bookings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      bookingId: string;
      action: "force_complete" | "cancel" | "replace_driver" | "create_assignment"
            | "set_return_mode" | "record_uber_return" | "mark_returned";
      assignmentId?: string;
      newDriverId?: string;
      role?: "PRIMARY" | "SUPPORT";
      /* set_return_mode */
      returnMode?: "UBER" | "SUPPORT";
      /* record_uber_return */
      uberRef?: string;
      uberCost?: number;
      /* cancel: actual return-related cost Movo already paid, kept back from the refund */
      returnCostDeduction?: number;
    };

    const { bookingId, action } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { careAssignments: true },
    });
    if (!booking || booking.bookingType !== "CARE") {
      return NextResponse.json({ error: "Care booking not found" }, { status: 404 });
    }

    if (action === "force_complete") {
      await prisma.$transaction([
        prisma.careAssignment.updateMany({
          where: { bookingId, status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"] } },
          data:  { status: "COMPLETED", completedAt: new Date() },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data:  { status: "COMPLETED", completedAt: new Date() },
        }),
      ]);
      dispatchCareBookingClosed({ bookingId, userId: booking.userId });
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      /* Admin-forced cancellation is always a full refund if payment was collected —
         mirrors the standard-ride cancel policy in /api/bookings/[id]/status. */
      let refunded = false;
      let refundError: string | undefined;
      let refundId: string | undefined;

      /* Movo Team rule: the Return Logistics Allowance is refunded unless Movo
         already paid a real return-related cost — admin enters that amount and
         it is kept back from the (otherwise full) refund. */
      const deduction = Math.max(0, Math.min(Number(body.returnCostDeduction) || 0, booking.total));
      if (booking.stripePaymentIntentId && booking.paymentStatus === "PAID" && deduction < booking.total) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripePaymentIntentId,
            ...(deduction > 0 ? { amount: Math.round((booking.total - deduction) * 100) } : {}),
          });
          refunded = true;
          refundId = refund.id;
        } catch (refundErr) {
          console.error("[admin care cancel] Stripe refund failed:", refundErr);
          refundError = "Refund could not be processed automatically. Please refund manually via the Stripe dashboard.";
        }
      }

      await prisma.$transaction([
        prisma.careAssignment.updateMany({
          where: { bookingId, status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] } },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data:  {
            status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "admin",
            ...(refunded ? { paymentStatus: "REFUNDED", refundId } : {}),
            /* The kept-back amount is the real return cost Movo incurred */
            ...(deduction > 0 ? { uberReturnCost: deduction } : {}),
          },
        }),
      ]);
      dispatchCareBookingClosed({ bookingId, userId: booking.userId });
      return NextResponse.json({ ok: true, refunded, ...(refundError ? { refundError } : {}) });
    }

    if (action === "replace_driver") {
      const { assignmentId, newDriverId } = body;
      if (!assignmentId || !newDriverId) {
        return NextResponse.json({ error: "assignmentId and newDriverId required" }, { status: 400 });
      }
      const assignment = await prisma.careAssignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.bookingId !== bookingId) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      const oppositeRole = assignment.role === "PRIMARY" ? "SUPPORT" : "PRIMARY";
      const conflicting = booking.careAssignments.find(
        (a) => a.role === oppositeRole && a.driverId === newDriverId &&
          /* AWAITING_RETURN included: a PRIMARY waiting to be collected is
             still on this booking, and must never be dispatched as its own
             SUPPORT (i.e. sent to pick themselves up). */
          ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"].includes(a.status),
      );
      if (conflicting) {
        return NextResponse.json({ error: `This driver is already assigned as ${oppositeRole} on this booking` }, { status: 409 });
      }

      await prisma.careAssignment.update({
        where: { id: assignmentId },
        data:  { driverId: newDriverId, status: "PENDING", dispatchedAt: new Date(), acceptedAt: null },
      });

      /* Notify the new driver via push + socket */
      await pushToDriver(newDriverId, {
        title: assignment.role === "PRIMARY" ? "🌟 Safe Ride — Primary Chauffeur" : "🔄 Care Ride — Support Chauffeur",
        body:  `You have been assigned to a Care Ride. Tap to view details.`,
        tag:   `care-${assignment.role.toLowerCase()}-${bookingId}`,
        data:  { type: assignment.role === "PRIMARY" ? "care_primary" : "care_support", bookingId, assignmentId, requireInteraction: "true" },
      }).catch(() => {});

      dispatchCareAssignmentStatus({
        bookingId, assignmentId,
        role:   assignment.role,
        status: "PENDING",
        driverId: newDriverId,
        userId:   booking.userId,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "create_assignment") {
      const { newDriverId, role } = body;
      if (!newDriverId || !role) {
        return NextResponse.json({ error: "newDriverId and role required" }, { status: 400 });
      }
      if (role !== "PRIMARY" && role !== "SUPPORT") {
        return NextResponse.json({ error: "role must be PRIMARY or SUPPORT" }, { status: 400 });
      }

      const oppositeRole = role === "PRIMARY" ? "SUPPORT" : "PRIMARY";
      const conflicting = booking.careAssignments.find(
        (a) => a.role === oppositeRole && a.driverId === newDriverId &&
          /* AWAITING_RETURN included: a PRIMARY waiting to be collected is
             still on this booking, and must never be dispatched as its own
             SUPPORT (i.e. sent to pick themselves up). */
          ["PENDING", "ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"].includes(a.status),
      );
      if (conflicting) {
        return NextResponse.json({ error: `This driver is already assigned as ${oppositeRole} on this booking` }, { status: 409 });
      }

      /* Cancel any existing PENDING assignments for that role before creating new one */
      await prisma.careAssignment.updateMany({
        where: { bookingId, role, status: "PENDING" },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      });

      const assignment = await prisma.careAssignment.create({
        data: {
          bookingId,
          driverId:    newDriverId,
          role,
          status:      "PENDING",
          dispatchedAt: new Date(),
        },
      });

      /* Notify the assigned driver via push + socket */
      await pushToDriver(newDriverId, {
        title: role === "PRIMARY" ? "🌟 Safe Ride — Primary Chauffeur" : "🔄 Care Ride — Support Chauffeur",
        body:  `Admin has manually assigned you to a Care Ride. Tap to view.`,
        tag:   `care-${role.toLowerCase()}-${bookingId}`,
        data:  { type: role === "PRIMARY" ? "care_primary" : "care_support", bookingId, assignmentId: assignment.id, requireInteraction: "true" },
      }).catch(() => {});

      if (role === "PRIMARY") {
        dispatchCarePrimaryDispatched({ bookingId, assignmentId: assignment.id, driverId: newDriverId, userId: booking.userId });
      } else {
        dispatchCareSupportDispatched({ bookingId, driverIds: [newDriverId], userId: booking.userId });
      }

      return NextResponse.json({ ok: true, assignmentId: assignment.id });
    }

    /* ── Uber return (Milestone 3) ───────────────────────────────────────── */

    if (action === "set_return_mode") {
      const mode = body.returnMode;
      if (mode !== "UBER" && mode !== "SUPPORT") {
        return NextResponse.json({ error: "returnMode must be UBER or SUPPORT" }, { status: 400 });
      }
      if (booking.uberReturnBookedAt && mode === "SUPPORT") {
        return NextResponse.json({ error: "An Uber return is already booked for this ride" }, { status: 409 });
      }
      await prisma.booking.update({ where: { id: bookingId }, data: { returnMode: mode } });

      /* Switching to a Support Chauffeur after PRIMARY has accepted: start the
         Support search now (it normally starts when PRIMARY accepts). */
      const primary = booking.careAssignments.find((a) =>
        a.role === "PRIMARY" && ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"].includes(a.status));
      const supportActive = booking.careAssignments.some((a) =>
        a.role === "SUPPORT" && ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"].includes(a.status));
      if (mode === "SUPPORT" && primary && !supportActive) {
        const waiting = primary.status === "AWAITING_RETURN";
        dispatchSupport(
          bookingId,
          waiting ? (booking.primaryReadyLat ?? booking.dropoffLat ?? null) : (booking.dropoffLat ?? null),
          waiting ? (booking.primaryReadyLng ?? booking.dropoffLng ?? null) : (booking.dropoffLng ?? null),
          booking.userId,
          primary.driverId ? [primary.driverId] : [],
        ).catch((e) => console.error("[admin care set_return_mode dispatch]", e));
      }
      logAudit({ action: "safe_ride.return_mode", entityType: "Booking", entityId: bookingId, actorType: "ADMIN", actorId: session.userId ?? null, detail: { returnMode: mode } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (action === "record_uber_return") {
      const cost = Number(body.uberCost);
      if (!Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ error: "Enter the Uber cost (CAD)" }, { status: 400 });
      }
      const ref = (body.uberRef ?? "").trim().slice(0, 120) || null;
      await prisma.booking.update({
        where: { id: bookingId },
        data:  { returnMode: "UBER", uberReturnRef: ref, uberReturnCost: cost, uberReturnBookedAt: new Date() },
      });

      /* Let PRIMARY know their ride back is on the way */
      const primary = booking.careAssignments.find((a) => a.role === "PRIMARY" && a.status === "AWAITING_RETURN");
      if (primary?.driverId) {
        const drv = await prisma.driver.findUnique({ where: { id: primary.driverId }, select: { phone: true, firstName: true } });
        sendNotification({
          eventType: "CHAUFFEUR_UBER_RETURN_BOOKED",
          recipient: { type: "driver", id: primary.driverId, firstName: drv?.firstName, phone: drv?.phone ?? undefined },
          data: {
            bookingId,
            refText: ref ? ` (ref ${ref})` : "",
            from: booking.dropoff,
            message: `Movo has booked an Uber to take you back to your vehicle at ${booking.pickup}.${ref ? ` Reference: ${ref}.` : ""}`,
          },
        }).catch((e) => console.error("[admin care uber booked notify]", e));
        dispatchCareAssignmentStatus({
          bookingId, assignmentId: primary.id, role: "PRIMARY",
          status: "AWAITING_RETURN", driverId: primary.driverId, userId: booking.userId,
        });
      }
      logAudit({ action: "safe_ride.uber_return_recorded", entityType: "Booking", entityId: bookingId, actorType: "ADMIN", actorId: session.userId ?? null, detail: { uberRef: ref, uberCost: cost } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_returned") {
      const primary = booking.careAssignments.find((a) => a.role === "PRIMARY" && a.status === "AWAITING_RETURN");
      if (!primary) {
        return NextResponse.json({ error: "No chauffeur is waiting for a return on this booking" }, { status: 409 });
      }
      await prisma.careAssignment.update({
        where: { id: primary.id },
        data:  { status: "COMPLETED", completedAt: new Date() },
      });
      /* PRIMARY is normally credited at drop-off already; this is idempotent */
      creditSafeRideEarning(bookingId, "PRIMARY").catch((e) => console.error("[admin care mark_returned earnings]", e));
      dispatchCareAssignmentStatus({
        bookingId, assignmentId: primary.id, role: "PRIMARY",
        status: "COMPLETED", driverId: primary.driverId, userId: booking.userId,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[admin care PATCH]", e);
    return NextResponse.json({ error: "Failed to perform admin action" }, { status: 500 });
  }
}
