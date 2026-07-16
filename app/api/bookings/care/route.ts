/**
 * POST /api/bookings/care
 *
 * Creates a single Safe Ride booking visible to the customer, then
 * immediately triggers PRIMARY chauffeur dispatch via CareAssignment records.
 * SUPPORT dispatch fires automatically when PRIMARY accepts.
 *
 * Booking status lifecycle for Care:
 *   PENDING  → payment captured, dispatching drivers
 *   CONFIRMED → both PRIMARY and SUPPORT have accepted  (set in assignments route)
 *   COMPLETED → both drivers completed                   (set in assignments route)
 *   CANCELLED → cancelled by user, driver, or admin
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { geocodeAddresses } from "@/lib/geocoding";
import { sendNotification } from "@/lib/notifications";
import { dispatchCareBookingCreated } from "@/lib/socket/dispatcher";
import { dispatchPrimary } from "@/lib/care/dispatch";
import { scheduleCareDispatch } from "@/lib/care/scheduledDispatch";
import { pushToAllDriversByTier } from "@/lib/webpush";

/* A Safe Ride whose pickup is further out than this is "scheduled" rather than
   ASAP — chauffeurs get an advance heads-up now and the real targeted dispatch
   fires a lead-time before pickup. Kept in sync with the standard-ride
   threshold in app/api/bookings/route.ts. */
const SCHEDULED_THRESHOLD_MS = 25 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    const userId  = session?.userId ?? null;

    const body = await req.json();
    const {
      clientName, pickup, dropoff,
      fare, serviceFee, gst, total,
      paymentStatus, stripePaymentIntentId,
      customerVehicle, scheduledAt,
    } = body;

    if (!clientName || !pickup || !dropoff) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const isValidSchedule = parsedScheduledAt && !isNaN(parsedScheduledAt.getTime());
    const isScheduled = isValidSchedule && parsedScheduledAt!.getTime() - Date.now() > SCHEDULED_THRESHOLD_MS;

    const coordinates = await geocodeAddresses(pickup, dropoff).catch(() => null);

    const resolvedPaymentStatus = paymentStatus === "PAID" ? "PAID" : "UNPAID";
    /* Booking stays PENDING until both chauffeurs accept — do NOT confirm at payment time */
    const resolvedStatus = "PENDING";

    /* ── Single booking — what the customer sees ── */
    const booking = await prisma.booking.create({
      data: {
        clientName,
        pickup,
        dropoff,
        pickupLat:  coordinates?.pickupLat  ?? null,
        pickupLng:  coordinates?.pickupLng  ?? null,
        dropoffLat: coordinates?.dropoffLat ?? null,
        dropoffLng: coordinates?.dropoffLng ?? null,
        carTier:    "care",
        carName:    customerVehicle ?? "Customer vehicle",
        fare:       Number(fare),
        serviceFee: Number(serviceFee),
        gst:        gst != null ? Number(gst) : null,
        total:      Number(total),
        paymentStatus: resolvedPaymentStatus as never,
        status:        resolvedStatus        as never,
        bookingType:   "CARE",
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        ...(userId ? { userId } : {}),
        ...(isValidSchedule ? { scheduledAt: parsedScheduledAt } : {}),
      },
    });

    /* ── Socket: notify admin dashboard ONLY (never the driver tier room) ── */
    dispatchCareBookingCreated({
      id: booking.id, pickup, dropoff, carTier: "care",
      carName: "Safe Ride",
      total: Number(total), status: resolvedStatus,
      createdAt: booking.createdAt.toISOString(),
    });

    /* ── Notify rider that booking is received and dispatching ── */
    if (userId && resolvedPaymentStatus === "PAID") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, phone: true },
      });
      if (user?.email) {
        sendNotification({
          eventType: "RIDER_BOOKING_CONFIRMED",
          recipient: {
            type: "user", id: userId,
            email: user.email, firstName: user.firstName,
            phone: user.phone ?? undefined,
          },
          data: {
            bookingId: booking.id, pickup, dropoff, carTier: "care",
            fare: Number(fare), serviceFee: Number(serviceFee), total: Number(total),
            message: isScheduled
              ? `Your Safe Ride is booked for ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. We'll line up your chauffeurs ahead of your pickup time.`
              : "Your Safe Ride is confirmed. We are now finding your chauffeurs.",
          },
        }).catch(() => {});
      }
    }

    /* ── Dispatch ──
       Immediate ride  → fire PRIMARY dispatch now (targeted, nearest-first).
       Scheduled ride  → push every eligible chauffeur an advance heads-up now,
                         then fire the real PRIMARY dispatch a lead-time before
                         the scheduled pickup. Pass null coords if geocoding
                         failed — dispatch.ts handles the no-coordinate fallback. */
    if (resolvedPaymentStatus === "PAID") {
      if (isScheduled) {
        pushToAllDriversByTier(null, {
          title: "🌟 New Scheduled Safe Ride",
          body:  `Pickup: ${pickup} at ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Open the app to be ready.`,
          tag:   `care-scheduled-${booking.id}`,
          data:  { type: "care_scheduled", bookingId: booking.id },
        }).catch(() => {});
        scheduleCareDispatch(booking.id, parsedScheduledAt!);
      } else {
        dispatchPrimary(
          booking.id,
          coordinates?.pickupLat  ?? null,
          coordinates?.pickupLng  ?? null,
          userId,
        ).catch((e) => console.error("[care dispatch primary]", e));
      }
    }

    return NextResponse.json({ bookingId: booking.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[care booking]", msg);
    return NextResponse.json({ error: "Failed to create Care Ride booking", detail: msg }, { status: 500 });
  }
}
