import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { geocodeAddresses } from "@/lib/geocoding";
import { PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const session = await getSession(req);

    /* ── Driver requesting PENDING bookings → tier-match + unassigned only ── */
    if (session?.driverId && status === "PENDING") {
      const driver = await prisma.driver.findUnique({
        where: { id: session.driverId },
        select: { vehicle: { select: { tier: true } } },
      });
      const tier = driver?.vehicle?.tier ?? null;

      const bookings = await prisma.booking.findMany({
        where: {
          status: "PENDING",
          OR: [
            // Pool bookings: paid, unassigned, tier-matched
            {
              driverId: null,
              paymentStatus: "PAID",
              ...(tier ? { carTier: tier } : {}),
            },
            // Direct bookings: rider picked this specific driver (any payment status)
            {
              driverId: session.driverId,
            },
          ],
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(bookings);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, pickup, dropoff, carTier, carName, fare, serviceFee, total, paymentStatus, stripePaymentIntentId, driverId } = body;

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
        total: Number(total),
        paymentStatus: resolvedPaymentStatus,
        status: resolvedStatus,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        ...(userId    ? { userId }    : {}),
        ...(driverId  ? { driverId }  : {}),
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Booking creation error:", msg);
    return NextResponse.json({ error: "Failed to create booking", detail: msg }, { status: 500 });
  }
}
