import { NextRequest, NextResponse } from "next/server";
import { releaseRideToPool } from "@/lib/dispatch/releaseRide";
import { refundBooking } from "@/lib/payments/refundBooking";
import { scheduleReservationReminders } from "@/lib/dispatch/reservationReminders";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { BookingStatus } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import { pushToDriver } from "@/lib/webpush";
import { normalizeCommissionRate } from "@/lib/earnings";
import { logAudit } from "@/lib/auditLog";
import { serviceLabel } from "@/lib/tierLabels";
import {
  dispatchBookingAccepted,
  dispatchBookingCancelled,
  dispatchBookingCompleted,
  dispatchBookingStatus,
  dispatchCareBookingClosed,
} from "@/lib/socket/dispatcher";


const VALID_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

/* After ANY cancellation outcome (refunded / refund-failed / nothing to refund):
   socket event so open apps update instantly, plus email/in-app (and SMS/push
   where it's news, not a confirmation) to the rider and the assigned chauffeur.
   Previously only the unpaid path emitted the socket event and nobody was
   notified — a rider cancelling a paid ride left the chauffeur driving to a
   pickup that no longer existed. */
async function notifyCancellationParties(opts: {
  bookingId: string;
  booking: { userId: string | null; driverId: string | null; pickup: string; dropoff: string; total: number };
  caller: string;
  refunded: boolean;
  refundAmount?: number;
  refundPending?: boolean;
}) {
  const { bookingId, booking, caller, refunded, refundAmount, refundPending } = opts;

  dispatchBookingCancelled({
    bookingId,
    driverId: booking.driverId,
    userId: booking.userId,
    cancelledBy: caller,
    refunded,
  });

  /* Rider — confirmation of their own cancel, or news that someone else cancelled */
  if (booking.userId) {
    const user = await prisma.user
      .findUnique({ where: { id: booking.userId }, select: { email: true, firstName: true, phone: true } })
      .catch(() => null);
    if (user?.email) {
      const refundMsg = refundPending
        ? "Your refund is being processed and will be confirmed shortly."
        : refunded
          ? `You've been refunded${refundAmount != null ? ` $${refundAmount.toFixed(2)}` : ""} to your original payment method.`
          : "";
      sendNotification({
        eventType: "RIDER_BOOKING_CANCELLED",
        /* SMS only when the rider did NOT cancel it themselves */
        channels: caller === "user" ? ["EMAIL", "IN_APP"] : ["EMAIL", "IN_APP", "SMS"],
        recipient: { type: "user", id: booking.userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
        data: {
          bookingId,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          cancelledBy: caller,
          refunded,
          refundAmount,
          refundPending,
          total: booking.total,
          refundMsg,
          message:
            caller === "user"
              ? `Your cancellation is confirmed.${refundMsg ? ` ${refundMsg}` : ""}`
              : `Your ride was cancelled${caller === "driver" ? " by your chauffeur" : ""}.${refundMsg ? ` ${refundMsg}` : ""}`,
        },
      }).catch(() => {});
    }
  }

  /* Chauffeur — skip when they cancelled it themselves */
  if (booking.driverId && caller !== "driver") {
    const driver = await prisma.driver
      .findUnique({ where: { id: booking.driverId }, select: { email: true, firstName: true, phone: true } })
      .catch(() => null);
    if (driver) {
      sendNotification({
        eventType: "CHAUFFEUR_BOOKING_CANCELLED",
        recipient: { type: "driver", id: booking.driverId, email: driver.email ?? "", firstName: driver.firstName, phone: driver.phone ?? undefined },
        data: { bookingId, pickup: booking.pickup, dropoff: booking.dropoff, cancelledBy: caller },
      }).catch(() => {});
      /* Web push so their phone buzzes even with the app backgrounded */
      pushToDriver(booking.driverId, {
        title: "Ride cancelled",
        body: `The ride from ${booking.pickup} was cancelled. You're back in the queue for new requests.`,
        tag: `booking-cancelled-${bookingId}`,
        data: { type: "booking_cancelled", bookingId },
      }).catch(() => {});
    }
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, cancelledBy, refundAmount } = body as { status: BookingStatus; cancelledBy?: string; refundAmount?: number };
    const session = await getSession(req);

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    /* ── Who may do what ──
       This route used to accept any caller: anyone could cancel any booking
       (claiming to be "admin" via the body) or mark it COMPLETED repeatedly,
       crediting the chauffeur's wallet each time. */
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = session.role === "ADMIN";
    const target = await prisma.booking.findUnique({ where: { id }, select: { userId: true, driverId: true } });
    if (!target) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const isRider          = !!session.userId && target.userId === session.userId;
    const isAssignedDriver = !!session.driverId && target.driverId === session.driverId;
    const allowed =
      isAdmin ||
      (status === "CONFIRMED" && !!session.driverId) ||          /* chauffeur claiming a ride */
      (status === "CANCELLED" && (isRider || isAssignedDriver)) ||
      (status === "COMPLETED" && isAssignedDriver);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
          const whenLabel = new Date(booking.scheduledAt!).toLocaleString("en-CA", { timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
          const whenLabel = new Date(booking.scheduledAt!).toLocaleString("en-CA", { timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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

      /* Reserved for later: remind the chauffeur, alert admins on a no-show */
      if (isScheduledAccept && booking?.scheduledAt && booking.bookingType !== "CARE") {
        scheduleReservationReminders(id, new Date(booking.scheduledAt), session.driverId);
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

    /* ── Chauffeur backing out of a ride they accepted: never cancel or refund
          the rider's trip — release it so the rider keeps searching and the
          next chauffeur can take it (same as the dashboard's cancel button) ── */
    if (status === "CANCELLED" && isAssignedDriver && !isAdmin && !isRider) {
      if (await releaseRideToPool(id, session.driverId!, null)) {
        return NextResponse.json({ ok: true, released: true });
      }
      return NextResponse.json(
        { error: "This ride can no longer be cancelled — it may have already started or completed." },
        { status: 409 }
      );
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
      /* Derived from the session — never trusted from the request body */
      const caller = isAdmin ? (cancelledBy === "system_timeout" ? "system_timeout" : "admin") : session.driverId ? "driver" : "user";

      /* Safe Ride has no booking.driverId — its chauffeur is an accepted
         PRIMARY assignment (checked before those are released below) */
      const careChauffeurAssigned = existing.bookingType === "CARE" && !!(await prisma.careAssignment.findFirst({
        where: { bookingId: id, role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED"] } },
        select: { id: true },
      }));

      /* Safe Ride: release the chauffeurs on this booking */
      if (existing.bookingType === "CARE") {
        await prisma.careAssignment.updateMany({
          where: { bookingId: id, status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] } },
          data:  { status: "CANCELLED", cancelledAt: now },
        });
        dispatchCareBookingClosed({ bookingId: id, userId: existing.userId });
      }

      if (existing.stripePaymentIntentId && existing.paymentStatus === "PAID") {
        try {
          /* ── Cancellation policy ── */
          const msElapsed    = now.getTime() - new Date(existing.createdAt).getTime();
          const within5Min   = msElapsed < 5 * 60 * 1000;
          const noDriver     = existing.bookingType === "CARE" ? !careChauffeurAssigned : !existing.driverId;
          const isAdminForce = caller === "admin";
          /* Driver bailing after accepting is the driver's fault, not the rider's —
             always a full refund regardless of how much time has elapsed. */
          const isDriverFault = caller === "driver";

          let policyRefundAmount: number | undefined;

          if (isAdminForce || isDriverFault) {
            /* Admin-specified amount overrides policy (admins only) */
            policyRefundAmount = isAdminForce ? refundAmount : undefined;
          } else if (within5Min || noDriver) {
            /* Full refund — free cancellation window or unassigned */
            policyRefundAmount = undefined;
          } else if (existing.bookingType === "CARE" && existing.careReturnAllowance && existing.fare > 0) {
            /* Safe Ride: the Return Logistics Allowance (and its GST) is always
               refunded before the trip starts — no Uber has been booked yet.
               The service portion follows the normal 50% policy. */
            const returnShare = Math.min(1, existing.careReturnAllowance / existing.fare);
            const returnGross = existing.total * returnShare;
            policyRefundAmount = parseFloat(((existing.total - returnGross) * 0.50 + returnGross).toFixed(2));
          } else {
            /* Partial: 50% refund */
            policyRefundAmount = parseFloat((existing.total * 0.50).toFixed(2));
          }

          /* Across the checkout payment AND any extra charges (stops, destination
             change, waiting) — booking.total includes those */
          const isPartial = !!policyRefundAmount && policyRefundAmount > 0 && policyRefundAmount < existing.total;
          const { refundIds } = await refundBooking({
            bookingId: id,
            checkoutIntentId: existing.stripePaymentIntentId,
            ...(isPartial ? { amount: policyRefundAmount } : {}),
          });
          const refund = { id: refundIds[0] };
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
          notifyCancellationParties({
            bookingId: id,
            booking: existing,
            caller,
            refunded: true,
            refundAmount: isPartial ? policyRefundAmount : existing.total,
          }).catch(() => {});
          logAudit({ action: "booking.cancelled", entityType: "Booking", entityId: id, actorType: caller === "admin" ? "ADMIN" : caller === "driver" ? "DRIVER" : "USER", actorId: session?.userId ?? session?.driverId ?? null, detail: { cancelledBy: caller, refunded: true, partialRefund: isPartial } }).catch(() => {});
          return NextResponse.json({
            ...booking, refunded: true, partialRefund: isPartial,
            refundAmount: isPartial ? policyRefundAmount : existing.total,
          });
        } catch (refundErr) {
          console.error("[Stripe] Refund failed:", refundErr);
          const booking = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED", cancelledAt: now, cancelledBy: caller },
          });
          notifyCancellationParties({
            bookingId: id,
            booking: existing,
            caller,
            refunded: false,
            refundPending: true,
          }).catch(() => {});
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
      notifyCancellationParties({
        bookingId: id,
        booking: existing,
        caller,
        refunded: false,
      }).catch(() => {});
      logAudit({ action: "booking.cancelled", entityType: "Booking", entityId: id, actorType: caller === "admin" ? "ADMIN" : caller === "driver" ? "DRIVER" : caller === "system_timeout" ? "SYSTEM" : "USER", actorId: session?.userId ?? session?.driverId ?? null, detail: { cancelledBy: caller, refunded: false } }).catch(() => {});
      return NextResponse.json({ ...booking, refunded: false });
    }

    /* ── COMPLETED — update booking and auto-credit driver earnings ── */
    if (status === "COMPLETED") {
      const existing = await prisma.booking.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      /* Atomic: only a CONFIRMED booking completes, exactly once — a repeat
         call must not credit the chauffeur's wallet again */
      const done = await prisma.booking.updateMany({
        /* A chauffeur can only complete a trip they actually started */
        where: { id, status: "CONFIRMED", ...(isAdmin ? {} : { startedAt: { not: null } }) },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (done.count === 0) {
        return NextResponse.json(
          { error: existing.status === "COMPLETED" ? "Ride already completed"
              : existing.status === "CONFIRMED" && !existing.startedAt ? "Start the trip before completing it"
              : "Only a confirmed ride can be completed" },
          { status: 409 },
        );
      }
      const booking = (await prisma.booking.findUnique({ where: { id } }))!;

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

        const commission = normalizeCommissionRate(tierConfig?.commissionRate);
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
              completedAt: new Date().toLocaleString("en-CA", { timeZone: "America/Winnipeg" }),
            },
          }).catch(() => {});

          /* Detailed final receipt — actual trip charges as recorded on the booking
             (base fare + any stops/airport fees added during the ride + taxes) */
          if (existing.paymentStatus === "PAID") {
            const receiptItems = [
              { label: "Ride Fare", amount: existing.fare },
              ...(existing.additionalStopFee ? [{ label: "Additional Stops", amount: existing.additionalStopFee }] : []),
              ...(existing.airportFee ? [{ label: "Airport Pickup Fee", amount: existing.airportFee }] : []),
              ...(existing.waitingFee ? [{ label: "Waiting Time", amount: existing.waitingFee }] : []),
              { label: "Service Fee", amount: existing.serviceFee },
              ...(existing.gst ? [{ label: "GST", amount: existing.gst }] : []),
            ];
            sendNotification({
              eventType: "RIDER_PAYMENT_RECEIPT",
              recipient: { type: "user", id: existing.userId, email: user.email, firstName: user.firstName },
              data: {
                bookingId: id,
                paymentId: existing.stripePaymentIntentId ?? id,
                receiptNumber: existing.receiptNumber,
                bookingNumber: existing.bookingNumber,
                serviceLabel: serviceLabel(existing.carTier, existing.bookingType),
                amount: existing.total,
                method: "Card",
                date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Winnipeg", year: "numeric", month: "long", day: "numeric" }),
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
  } catch (e) {
    console.error("[bookings status PATCH]", e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
