import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { geocodeAddresses } from "@/lib/geocoding";
import { PaymentStatus } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import { pushToOnlineDriversByTier, pushToAllDriversByTier } from "@/lib/webpush";
import { dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { scheduleStandardDispatchTimeout } from "@/lib/dispatch/standardTimeout";
import { computeDriverEarning } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const session = await getSession(req);

    /* ── Driver requesting available bookings → tier-match + unassigned only ── */
    if (session?.driverId && status === "PENDING") {
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

    /* ── Admin / general query ── */
    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PAID", "FAILED", "REFUNDED"];

/* A ride whose requested time is further out than this is treated as
   "scheduled" rather than ASAP — offline drivers get pushed too, and the
   no-driver refund timeout anchors to the pickup time instead of now. */
const SCHEDULED_THRESHOLD_MS = 25 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, pickup, dropoff, carTier, carName, fare, serviceFee, gst, additionalStopFee, airportFee, total, paymentStatus, stripePaymentIntentId, scheduledAt } = body;

    if (!clientName || !pickup || !dropoff || !carTier || !carName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Geocode addresses to get coordinates (non-fatal — booking proceeds even without coords)
    const coordinates = await geocodeAddresses(pickup, dropoff).catch(() => null);

    const resolvedPaymentStatus: PaymentStatus =
      paymentStatus && VALID_PAYMENT_STATUSES.includes(paymentStatus)
        ? paymentStatus
        : "UNPAID";

    /* Auto-confirm bookings the moment payment is received — no admin approval needed */
    const resolvedStatus = resolvedPaymentStatus === "PAID" ? "CONFIRMED" : "PENDING";

    const session = await getSession(req);
    const userId = session?.userId ?? null;

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
        fare: Number(fare),
        serviceFee: Number(serviceFee),
        gst: gst != null ? Number(gst) : null,
        additionalStopFee: additionalStopFee != null ? Number(additionalStopFee) : null,
        airportFee: airportFee != null ? Number(airportFee) : null,
        total: Number(total),
        paymentStatus: resolvedPaymentStatus,
        status: resolvedStatus,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        ...(userId ? { userId } : {}),
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
          channels: ["IN_APP"],
          recipient: { type: "user", id: userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
          data: {
            bookingId: booking.id,
            title: "Booking received",
            message: isScheduled
              ? "Payment received — we'll line up your chauffeur ahead of your scheduled time."
              : "Payment received — we're finding your chauffeur now.",
            pickup, dropoff, carTier,
            fare: Number(fare), serviceFee: Number(serviceFee), total: Number(total),
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
      body:  `Pickup: ${pickup}${isScheduled ? ` at ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}`,
      tag:   `booking-${booking.id}`,
      data:  { type: "new_booking", bookingId: booking.id, requireInteraction: "true" },
    }).catch(() => {});

    /* Scheduled rides also reach OFFLINE drivers — they can open the app and
       claim a future request in advance without being on shift right now. */
    if (isScheduled) {
      pushToAllDriversByTier(carTier ?? null, {
        title: "📅 New Scheduled Ride",
        body:  `Pickup: ${pickup} at ${parsedScheduledAt!.toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Open the app to accept.`,
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
