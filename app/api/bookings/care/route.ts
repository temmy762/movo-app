/**
 * POST /api/bookings/care
 *
 * Creates a Movo Care Ride booking: one parent booking visible to the customer
 * plus two linked child assignments (PRIMARY driver, RECOVERY driver).
 *
 * The customer always sees one booking. Internally two drivers are dispatched.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { geocodeAddresses } from "@/lib/geocoding";
import { sendNotification } from "@/lib/notifications";
import { dispatchBookingCreated } from "@/lib/socket/dispatcher";
import { pushToOnlineDriversByTier } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    const userId  = session?.userId ?? null;

    const body = await req.json();
    const {
      clientName, pickup, dropoff,
      fare, serviceFee, gst, total,
      paymentStatus, stripePaymentIntentId,
      customerVehicle,            // e.g. "Toyota Camry - ABC 123"
    } = body;

    if (!clientName || !pickup || !dropoff) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const coordinates = await geocodeAddresses(pickup, dropoff).catch(() => null);

    const resolvedPaymentStatus = paymentStatus === "PAID" ? "PAID" : "UNPAID";
    const resolvedStatus        = resolvedPaymentStatus === "PAID" ? "CONFIRMED" : "PENDING";

    /* ── 1. Parent booking (what the customer sees) ── */
    const parent = await prisma.booking.create({
      data: {
        clientName,
        pickup, dropoff,
        pickupLat:  coordinates?.pickupLat  ?? null,
        pickupLng:  coordinates?.pickupLng  ?? null,
        dropoffLat: coordinates?.dropoffLat ?? null,
        dropoffLng: coordinates?.dropoffLng ?? null,
        carTier:    "black",
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
      },
    });

    /* ── 2. PRIMARY assignment — driver takes customer home in their car ── */
    const primary = await prisma.booking.create({
      data: {
        clientName,
        pickup, dropoff,
        pickupLat:  coordinates?.pickupLat  ?? null,
        pickupLng:  coordinates?.pickupLng  ?? null,
        dropoffLat: coordinates?.dropoffLat ?? null,
        dropoffLng: coordinates?.dropoffLng ?? null,
        carTier:    "black",
        carName:    customerVehicle ?? "Customer vehicle",
        fare:       Number(fare) * 0.7,  /* 70% of fare to primary driver */
        serviceFee: 0,
        total:      Number(fare) * 0.7,
        paymentStatus: "PAID",
        status:     resolvedStatus as never,
        bookingType: "CARE",
        assignmentType: "PRIMARY",
        parentBookingId: parent.id,
        ...(userId ? { userId } : {}),
      },
    });

    /* ── 3. RECOVERY assignment — driver B picks up driver A after completion ── */
    const recovery = await prisma.booking.create({
      data: {
        clientName: `[Recovery] ${clientName}`,
        pickup:     dropoff,  /* Recovery driver starts at the dropoff point */
        dropoff:    pickup,   /* Returns to origin after pickup */
        carTier:    "black",
        carName:    "Recovery vehicle",
        fare:       Number(fare) * 0.3,  /* 30% of fare to recovery driver */
        serviceFee: 0,
        total:      Number(fare) * 0.3,
        paymentStatus: "PAID",
        status:     resolvedStatus as never,
        bookingType:    "CARE",
        assignmentType: "RECOVERY",
        parentBookingId: parent.id,
      },
    });

    /* ── Notify rider confirmation ── */
    if (userId && resolvedStatus === "CONFIRMED") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, phone: true },
      });
      if (user?.email) {
        sendNotification({
          eventType: "RIDER_BOOKING_CONFIRMED",
          recipient: { type: "user", id: userId, email: user.email, firstName: user.firstName, phone: user.phone ?? undefined },
          data: { bookingId: parent.id, pickup, dropoff, carTier: "black", fare: Number(fare), serviceFee: Number(serviceFee), total: Number(total) },
        }).catch(() => {});
      }
    }

    /* ── Socket: notify admin + all Black-tier drivers ── */
    dispatchBookingCreated({
      id: parent.id, pickup, dropoff, carTier: "black", carName: "Movo Care Ride",
      total: Number(total), status: resolvedStatus, createdAt: parent.createdAt.toISOString(),
    });

    /* ── Push notifications to Black-tier online drivers ── */
    pushToOnlineDriversByTier("black", {
      title: "🌟 Movo Care Ride Request",
      body:  `Pickup: ${pickup} — Two-chauffeur job`,
      tag:   `care-${parent.id}`,
      data:  { type: "new_booking", bookingId: primary.id, requireInteraction: "true" },
    }).catch(() => {});

    pushToOnlineDriversByTier("black", {
      title: "🔄 Care Ride Recovery Assignment",
      body:  `Recovery from: ${dropoff}`,
      tag:   `care-recovery-${parent.id}`,
      data:  { type: "new_booking", bookingId: recovery.id, requireInteraction: "true" },
    }).catch(() => {});

    return NextResponse.json(
      { parentBookingId: parent.id, primaryBookingId: primary.id, recoveryBookingId: recovery.id },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[care booking]", msg);
    return NextResponse.json({ error: "Failed to create Care Ride booking", detail: msg }, { status: 500 });
  }
}
