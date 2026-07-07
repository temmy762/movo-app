import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { BookingStatus } from "@prisma/client";
import Stripe from "stripe";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/auditLog";
import {
  dispatchBookingAccepted,
  dispatchBookingCancelled,
  dispatchBookingCompleted,
  dispatchBookingStatus,
} from "@/lib/socket/dispatcher";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const VALID_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, cancelledBy, refundAmount } = body as { status: BookingStatus; cancelledBy?: string; refundAmount?: number };
    const session = await getSession(req);

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    /* ── Atomic claim: only succeeds if booking is unclaimed + still available ── */
    if (status === "CONFIRMED" && session?.driverId) {
      const result = await prisma.booking.updateMany({
        where: {
          id,
          OR: [
            /* PENDING bookings — standard pool */
            { status: "PENDING", OR: [{ driverId: null }, { driverId: session.driverId }] },
            /* CONFIRMED but unassigned — paid bookings auto-confirm on creation */
            { status: "CONFIRMED", driverId: null },
            /* CONFIRMED and pre-assigned to this driver — rider picked specific driver */
            { status: "CONFIRMED", driverId: session.driverId },
          ],
        },
        data:  { status: "CONFIRMED", driverId: session.driverId, acceptedAt: new Date() },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Booking already accepted by another driver" },
          { status: 409 }
        );
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          user:   { select: { id: true, email: true, firstName: true, phone: true } },
          driver: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, vehicle: { select: { make: true, model: true, plate: true } } } },
        },
      });

      /* Notify rider that a chauffeur has accepted.
         Immediate ride → "your chauffeur is on the way" (email + SMS + in-app).
         Scheduled ride → "reservation confirmed for <time>" (in-app only). We do
         NOT send the "on the way" SMS days ahead — that fires when the chauffeur
         actually starts heading to pickup on the scheduled date (start route). */
      const isScheduledAccept = booking?.scheduledAt
        && new Date(booking.scheduledAt).getTime() > Date.now() + 25 * 60 * 1000;
      if (booking?.user?.email && booking.driver) {
        const driverName = `${booking.driver.firstName} ${booking.driver.lastName}`;
        const vehicle = booking.driver.vehicle ? `${booking.driver.vehicle.make} ${booking.driver.vehicle.model} (${booking.driver.vehicle.plate})` : "N/A";
        if (isScheduledAccept) {
          const whenLabel = new Date(booking.scheduledAt!).toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
          sendNotification({
            eventType: "RIDER_DRIVER_ASSIGNED",
            channels: ["IN_APP"],
            recipient: { type: "user", id: booking.user.id, email: booking.user.email, firstName: booking.user.firstName, phone: booking.user.phone ?? undefined },
            data: {
              bookingId: id,
              title: "Reservation confirmed",
              message: `${driverName} is confirmed for your ride on ${whenLabel}. You'll be notified when they set off.`,
              driverName, vehicle, pickup: booking.pickup, dropoff: booking.dropoff,
            },
          }).catch(() => {});
        } else {
          sendNotification({
            eventType: "RIDER_DRIVER_ASSIGNED",
            recipient: { type: "user", id: booking.user.id, email: booking.user.email, firstName: booking.user.firstName, phone: booking.user.phone ?? undefined },
            data: {
              bookingId: id,
              driverName, vehicle,
              pickup: booking.pickup, dropoff: booking.dropoff,
            },
          }).catch(() => {});
        }
      }

      /* Notify the accepting chauffeur. For a scheduled reservation, email them
         (real address) prompting them to log in and review it in Reserved Rides
         — the previous code passed email:"" so no email ever went out. */
      if (booking?.driver?.id) {
        const driverName = `${booking.driver.firstName} ${booking.driver.lastName}`;
        if (isScheduledAccept) {
          const whenLabel = new Date(booking.scheduledAt!).toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
          sendNotification({
            eventType: "CHAUFFEUR_BOOKING_ASSIGNED",
            channels: ["EMAIL", "IN_APP"],
            recipient: { type: "driver", id: booking.driver.id, email: booking.driver.email ?? "", firstName: booking.driver.firstName, phone: booking.driver.phone ?? undefined },
            data: {
              bookingId: id,
              title: "New reservation confirmed",
              message: `You have a reserved ride on ${whenLabel} — pickup ${booking.pickup}. Log in to review it in Reserved Rides and set off on the day.`,
              driverName, pickup: booking.pickup, dropoff: booking.dropoff, scheduledAt: whenLabel,
            },
          }).catch(() => {});
        } else {
          sendNotification({
            eventType: "CHAUFFEUR_BOOKING_ASSIGNED",
            recipient: { type: "driver", id: booking.driver.id, email: booking.driver.email ?? "", firstName: booking.driver.firstName, phone: booking.driver.phone ?? undefined },
            data: { bookingId: id, pickup: booking?.pickup, dropoff: booking?.dropoff },
          }).catch(() => {});
        }
      }

      /* Socket: instant update to rider + admin */
      dispatchBookingAccepted({
        bookingId: id,
        driverId:  session.driverId,
        userId:    booking?.user?.id,
        driverName: booking?.driver ? `${booking.driver.firstName} ${booking.driver.lastName}` : "",
        vehicle:   booking?.driver?.vehicle ? `${booking.driver.vehicle.make} ${booking.driver.vehicle.model}` : "",
        pickup:    booking?.pickup ?? "",
        dropoff:   booking?.dropoff ?? "",
      });

      return NextResponse.json(booking);
    }

    /* ── CANCELLED — issue Stripe refund if payment was collected ── */
    if (status === "CANCELLED") {
      const existing = await prisma.booking.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      /* Block double-cancel */
      if (existing.status === "CANCELLED") {
        return NextResponse.json({ ...existing, refunded: existing.paymentStatus === "REFUNDED" });
      }

      /* Block cancellation of an already-started trip */
      if (existing.startedAt) {
        return NextResponse.json(
          { error: "Cannot cancel a trip that has already started" },
          { status: 409 }
        );
      }

      const now = new Date();
      const caller = cancelledBy ?? (session?.driverId ? "driver" : session?.userId ? "user" : "admin");

      if (existing.stripePaymentIntentId && existing.paymentStatus === "PAID") {
        try {
          /* ── Cancellation policy ── */
          const msElapsed    = now.getTime() - new Date(existing.createdAt).getTime();
          const within5Min   = msElapsed < 5 * 60 * 1000;
          const noDriver     = !existing.driverId;
          const isAdminForce = caller === "admin";
          /* Driver bailing after accepting is the driver's fault, not the rider's —
             always a full refund regardless of how much time has elapsed. */
          const isDriverFault = caller === "driver";

          let policyRefundAmount: number | undefined;

          if (isAdminForce || isDriverFault || refundAmount !== undefined) {
            /* Admin-specified amount overrides policy */
            policyRefundAmount = refundAmount;
          } else if (within5Min || noDriver) {
            /* Full refund — free cancellation window or unassigned */
            policyRefundAmount = undefined;
          } else {
            /* Partial: 50% refund */
            policyRefundAmount = parseFloat((existing.total * 0.50).toFixed(2));
          }

          const refundParams: Stripe.RefundCreateParams = { payment_intent: existing.stripePaymentIntentId };
          if (policyRefundAmount && policyRefundAmount > 0 && policyRefundAmount < existing.total) {
            refundParams.amount = Math.round(policyRefundAmount * 100); /* cents */
          }
          const refund = await stripe.refunds.create(refundParams);
          const isPartial = !!refundParams.amount;
          const booking = await prisma.booking.update({
            where: { id },
            data: {
              status: "CANCELLED",
              paymentStatus: "REFUNDED",
              cancelledAt: now,
              cancelledBy: caller,
              refundId: refund.id,
            },
          });
          logAudit({ action: "booking.cancelled", entityType: "Booking", entityId: id, actorType: caller === "admin" ? "ADMIN" : caller === "driver" ? "DRIVER" : "USER", actorId: session?.userId ?? session?.driverId ?? null, detail: { cancelledBy: caller, refunded: true, partialRefund: isPartial } }).catch(() => {});
          return NextResponse.json({ ...booking, refunded: true, partialRefund: isPartial });
        } catch (refundErr) {
          console.error("[Stripe] Refund failed:", refundErr);
          const booking = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED", cancelledAt: now, cancelledBy: caller },
          });
          return NextResponse.json({
            ...booking,
            refunded: false,
            refundError: "Refund could not be processed automatically. Please refund manually via admin dashboard.",
          });
        }
      }

      /* No payment to refund — just cancel */
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: now, cancelledBy: caller },
      });
      /* Socket: notify all parties */
      dispatchBookingCancelled({
        bookingId: id,
        driverId:  existing.driverId,
        userId:    existing.userId,
        cancelledBy: caller,
        refunded: false,
      });
      logAudit({ action: "booking.cancelled", entityType: "Booking", entityId: id, actorType: caller === "admin" ? "ADMIN" : caller === "driver" ? "DRIVER" : caller === "system_timeout" ? "SYSTEM" : "USER", actorId: session?.userId ?? session?.driverId ?? null, detail: { cancelledBy: caller, refunded: false } }).catch(() => {});
      return NextResponse.json({ ...booking, refunded: false });
    }

    /* ── COMPLETED — update booking and auto-credit driver earnings ── */
    if (status === "COMPLETED") {
      const existing = await prisma.booking.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const booking = await prisma.booking.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      /* Auto-credit driver earnings after platform commission + fleet split */
      if (existing.driverId && existing.fare > 0) {
        const [tierConfig, driver] = await Promise.all([
          prisma.vehicleTierConfig.findFirst({
            where: { tier: { equals: existing.carTier ?? "classic", mode: "insensitive" } },
            select: { commissionRate: true },
          }).catch(() => null),
          prisma.driver.findUnique({
            where: { id: existing.driverId },
            select: { fleetOwnerId: true, fleetDriverSplit: true },
          }).catch(() => null),
        ]);

        const commission = tierConfig?.commissionRate ?? 0.20;
        const netAfterPlatform = parseFloat((existing.fare * (1 - commission)).toFixed(2));

        const driverSplit     = driver?.fleetDriverSplit ?? 1.0;
        const driverEarning   = parseFloat((netAfterPlatform * driverSplit).toFixed(2));
        const fleetEarning    = parseFloat((netAfterPlatform * (1 - driverSplit)).toFixed(2));

        const txNote = `Trip earning — booking ${id} (${Math.round(commission * 100)}% platform fee)`;

        const txOps: Promise<unknown>[] = [
          prisma.walletTransaction.create({
            data: {
              driverId: existing.driverId,
              type: "EARNING",
              status: "COMPLETED",
              amount: driverEarning,
              note: txNote,
            },
          }),
        ];

        /* Credit fleet owner if this driver belongs to a fleet */
        if (driver?.fleetOwnerId && fleetEarning > 0) {
          txOps.push(
            prisma.walletTransaction.create({
              data: {
                driverId: driver.fleetOwnerId,
                type: "EARNING",
                status: "COMPLETED",
                amount: fleetEarning,
                note: `Fleet earning — booking ${id}`,
              },
            })
          );
        }

        await Promise.all(txOps);
      }

      /* Notify rider trip is complete */
      if (existing.userId) {
        const [user, driver] = await Promise.all([
          prisma.user.findUnique({
            where: { id: existing.userId },
            select: { email: true, firstName: true, phone: true },
          }),
          existing.driverId ? prisma.driver.findUnique({
            where: { id: existing.driverId },
            select: { firstName: true, lastName: true, vehicle: { select: { make: true, model: true } } },
          }) : Promise.resolve(null),
        ]);
        if (user?.email) {
          sendNotification({
            eventType: "RIDER_RIDE_COMPLETED",
            recipient: { type: "user", id: existing.userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
            data: {
              bookingId: id,
              pickup: existing.pickup,
              dropoff: existing.dropoff,
              driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Your driver",
              vehicleInfo: driver?.vehicle ? `${driver.vehicle.make} ${driver.vehicle.model}` : "",
              total: existing.total,
              completedAt: new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" }),
            },
          }).catch(() => {});

          /* Detailed final receipt — actual trip charges as recorded on the booking
             (base fare + any stops/airport fees added during the ride + taxes) */
          if (existing.paymentStatus === "PAID") {
            const receiptItems = [
              { label: "Ride Fare", amount: existing.fare },
              ...(existing.additionalStopFee ? [{ label: "Additional Stops", amount: existing.additionalStopFee }] : []),
              ...(existing.airportFee ? [{ label: "Airport Pickup Fee", amount: existing.airportFee }] : []),
              { label: "Service Fee", amount: existing.serviceFee },
              ...(existing.gst ? [{ label: "GST", amount: existing.gst }] : []),
            ];
            sendNotification({
              eventType: "RIDER_PAYMENT_RECEIPT",
              recipient: { type: "user", id: existing.userId, email: user.email, firstName: user.firstName },
              data: {
                bookingId: id,
                paymentId: existing.stripePaymentIntentId ?? id,
                amount: existing.total,
                method: "Card",
                date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "numeric" }),
                items: receiptItems,
              },
            }).catch(() => {});
          }
        }
      }

      /* Socket: trip completed */
      dispatchBookingCompleted({
        bookingId: id,
        driverId:  existing.driverId,
        userId:    existing.userId,
        total:     existing.total,
      });

      logAudit({ action: "booking.completed", entityType: "Booking", entityId: id, actorType: session?.driverId ? "DRIVER" : "SYSTEM", actorId: session?.driverId ?? null, detail: { total: existing.total } }).catch(() => {});

      return NextResponse.json(booking);
    }

    /* ── All other status transitions ── */
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    /* Socket: generic status change */
    dispatchBookingStatus({ bookingId: id, status, userId: null, driverId: null });
    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
