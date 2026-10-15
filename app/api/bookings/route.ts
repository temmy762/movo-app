import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isActiveDriver, INACTIVE_DRIVER_ERROR } from "@/lib/driverAccess";
import { geocodeAddresses } from "@/lib/geocoding";
import { PaymentStatus } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import { pushToOnlineDriversByTier, pushToAllDriversByTier } from "@/lib/webpush";
import { dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { scheduleStandardDispatchTimeout } from "@/lib/dispatch/standardTimeout";
import { computeDriverEarning } from "@/lib/earnings";
import { verifyBookingPayment } from "@/lib/bookingPayment";
import { nextBookingNumber, nextReceiptNumber } from "@/lib/references";
import { IN_CITY_RIDES_ENABLED } from "@/lib/launchConfig";
import { serviceLabel } from "@/lib/tierLabels";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const session = await getSession(req);

    /* ── Driver requesting available bookings → tier-match + unassigned only ── */
    if (session?.driverId && status === "PENDING") {
      if (!(await isActiveDriver(session.driverId))) return NextResponse.json([]);
      const driver = await prisma.driver.findUnique({
        where: { id: session.driverId },
        select: { vehicle: { select: { tier: true } }, fleetDriverSplit: true },
      });
      const tier = driver?.vehicle?.tier ?? null;

      const bookings = await prisma.booking.findMany({
        where: {
          /* Care Ride bookings are never offered through the generic pool —
             they are dispatched exclusively via CareAssignment (dispatchPrimary/
             dispatchSupport), which targets specific drivers individually. */
          bookingType: { not: "CARE" },
          /* Only unclaimed, paid, tier-matched bookings. Every ride is now
             broadcast (no rider-picks-a-driver "direct" bookings since the
             funnel overhaul), so once a chauffeur accepts, driverId is set and
             the ride drops out of the pool — it must NOT resurface as a new
             incoming request (that's what pulled just-accepted reserved and
             active rides back into the offer feed). */
          driverId: null,
          paymentStatus: "PAID",
          status: { in: ["PENDING", "CONFIRMED"] },
          ...(tier ? { carTier: tier } : {}),
        },
        orderBy: { createdAt: "asc" },
      });

      /* Attach each booking's chauffeur payout (net of commission + split) so
         the offer card shows the driver's earnings, not the customer total. */
      const enriched = await Promise.all(
        bookings.map(async (b) => ({
          ...b,
          earning: await computeDriverEarning(b.fare, b.carTier, driver),
        })),
      );
      return NextResponse.json(enriched);
    }

    /* ── Admin query — every booking, with rider names and addresses ── */
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (e) {
    console.error("[bookings GET]", e);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/* A ride whose requested time is further out than this is treated as
   "scheduled" rather than ASAP — offline drivers get pushed too, and the
   no-driver refund timeout anchors to the pickup time instead of now. */
const SCHEDULED_THRESHOLD_MS = 25 * 60 * 1000;

/* Optional booking details from checkout, cleaned and length-limited */
function bookingDetails(body: Record<string, unknown>) {
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const stops = Array.isArray(body.stops)
    ? (body.stops as unknown[]).filter((x): x is string => typeof x === "string" && !!x.trim()).map(x => x.trim()).slice(0, 3)
    : [];
  const passengers = Number(body.passengers);
  return {
    stops,
    riderName:          str(body.riderName, 80),
    riderPhone:         str(body.riderPhone, 30),
    pickupInstructions: str(body.pickupInstructions, 300),
    passengers:         Number.isInteger(passengers) && passengers > 0 && passengers <= 8 ? passengers : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    /* Launch scope: standard rides can only be booked while In-City is on
       (Airport/Hourly are refused earlier — the estimate won't quote them) */
    if (!IN_CITY_RIDES_ENABLED) {
      return NextResponse.json({ error: "This service is not currently available. Please book a Safe Ride." }, { status: 403 });
    }

    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Please log in to book a ride" }, { status: 401 });
    }
    const userId = session.userId;

    const body = await req.json();
    const { carTier, carName, quote: quoteToken, stripePaymentIntentId, scheduledAt } = body;
    const details = bookingDetails(body);

    if (!carTier || !carName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    /* Price, trip and payment status come only from the signed quote and a
       verified Stripe payment — never from the request body. */
    const verified = await verifyBookingPayment({
      userId, quoteToken, paymentIntentId: stripePaymentIntentId, tier: carTier,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }
    if (verified.existingBookingId) {
      const existing = await prisma.booking.findUnique({ where: { id: verified.existingBookingId } });
      return NextResponse.json(existing, { status: 200 });
    }
    const { fare, serviceFee, gst, additionalStopFee, airportFee, total } = verified.quote;
    /* The trip exactly as quoted and paid for */
    const { pickup, dropoff } = verified.quote;
    details.stops = verified.quote.stops ?? [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    /* Booking for someone else: the chauffeur sees (and calls) the rider */
    const clientName = details.riderName ?? (`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Guest");

    // Geocode addresses to get coordinates (non-fatal — booking proceeds even without coords)
    const coordinates = await geocodeAddresses(pickup, dropoff).catch(() => null);

    const resolvedPaymentStatus: PaymentStatus = "PAID";

    /* Auto-confirm bookings the moment payment is received — no admin approval needed */
    const resolvedStatus = "CONFIRMED";

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const isValidSchedule = parsedScheduledAt && !isNaN(parsedScheduledAt.getTime());
    const isScheduled = isValidSchedule && parsedScheduledAt!.getTime() - Date.now() > SCHEDULED_THRESHOLD_MS;

    /* No direct-to-driver assignment — every ride is routed automatically to
       whichever eligible chauffeur accepts first. */
    const booking = await prisma.booking.create({
      data: {
        clientName,
        pickup,
        dropoff,
        pickupLat: coordinates?.pickupLat ?? null,
        pickupLng: coordinates?.pickupLng ?? null,
        dropoffLat: coordinates?.dropoffLat ?? null,
        dropoffLng: coordinates?.dropoffLng ?? null,
        carTier,
        carName,
        fare,
        serviceFee,
        gst,
        additionalStopFee,
        airportFee,
        total,
        paymentStatus: resolvedPaymentStatus,
        status: resolvedStatus,
        stripePaymentIntentId: verified.paymentIntentId,
        userId,
        /* Permanent references: confirmed booking + recorded payment */
        bookingNumber:  await nextBookingNumber(),
        receiptNumber:  await nextReceiptNumber(),
        riderPhone:         details.riderPhone,
        passengers:         details.passengers,
        pickupInstructions: details.pickupInstructions,
        ...(details.stops.length ? { stops: details.stops } : {}),
        ...(isValidSchedule ? { scheduledAt: parsedScheduledAt } : {}),
      },
    });

    /* Notify rider that their PAYMENT was received and we're finding a chauffeur.
       This is NOT "Ride Confirmed" — that only fires once a chauffeur actually
       accepts (RIDER_DRIVER_ASSIGNED in the status route). In-app only, so we
       don't send a premature "confirmed" email/SMS. */
    if (resolvedPaymentStatus === "PAID" && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, phone: true },
      });
      if (user?.email) {
        sendNotification({
          eventType: "RIDER_BOOKING_CONFIRMED",
          /* Email too — it carries the booking number. "Chauffeur on the way"
             is a separate update sent when a chauffeur accepts. */
          channels: ["EMAIL", "IN_APP"],
          recipient: { type: "user", id: userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
          data: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            title: "Booking received",
            message: isScheduled
              ? "Payment received — we'll line up your chauffeur ahead of your scheduled time."
              : "Payment received — we're finding your chauffeur now.",
            pickup, dropoff, carTier,
            serviceLabel: serviceLabel(carTier),
            ...(isScheduled ? { scheduledDate: parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) } : {}),
            ...(details.stops.length ? { stops: details.stops } : {}),
            fare: Number(fare), serviceFee: Number(serviceFee), gst: Number(gst ?? 0), total: Number(total),
          },
        }).catch(() => {});
      }
    }

    /* Socket: notify all connected clients instantly */
    dispatchBookingCreated({
      id: booking.id, pickup, dropoff,
      carTier: carTier ?? "", carName,
      total: Number(total), status: resolvedStatus,
      createdAt: booking.createdAt.toISOString(),
    });

    /* Push ride-request alert to matching online drivers, always */
    pushToOnlineDriversByTier(carTier ?? null, {
      title: isScheduled ? "📅 New Scheduled Ride" : "🚗 New Ride Request",
      body:  `Pickup: ${pickup}${isScheduled ? ` at ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Winnipeg", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}`,
      tag:   `booking-${booking.id}`,
      data:  { type: "new_booking", bookingId: booking.id, requireInteraction: "true" },
    }).catch(() => {});

    /* Scheduled rides also reach OFFLINE drivers — they can open the app and
       claim a future request in advance without being on shift right now. */
    if (isScheduled) {
      pushToAllDriversByTier(carTier ?? null, {
        title: "📅 New Scheduled Ride",
        body:  `Pickup: ${pickup} at ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Winnipeg", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Open the app to accept.`,
        tag:   `booking-${booking.id}`,
        data:  { type: "new_booking", bookingId: booking.id, requireInteraction: "true" },
      }).catch(() => {});
    }

    /* If nobody claims a paid booking in time, auto-resolve it instead of
       leaving the rider charged and stuck on "Searching..." forever. Scheduled
       rides anchor the window to the requested pickup time, not to now. */
    if (resolvedPaymentStatus === "PAID") {
      scheduleStandardDispatchTimeout(booking.id, "pool", isScheduled ? parsedScheduledAt! : undefined);
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Booking creation error:", msg);
    return NextResponse.json({ error: "Failed to create booking", detail: msg }, { status: 500 });
  }
}
