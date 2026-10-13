/**
 * POST /api/bookings/[id]/destination
 *
 * Change the destination during an active ride. Price first, then confirm:
 *   { dropoff, quoteOnly: true } → the price difference on the real route
 *   { dropoff }                  → charge any increase, update the ride,
 *                                  and tell the chauffeur live
 *
 * A shorter trip costs nothing extra (no partial refund mid-ride). Safe Ride:
 * the chauffeur's return trip (destination → pickup) changes too, so the
 * Return Logistics Allowance is adjusted with the booking's own buffer.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { routeLeg, routeVia } from "@/lib/routing";
import { normalizeTier } from "@/lib/normalizeTier";
import { geocodeAddress } from "@/lib/geocoding";
import { getSafeRideServiceRates, getSafeRideSettings } from "@/lib/safeRide";
import { chargeRideExtra, notifyRouteChange, round2, stripe } from "@/lib/rideChanges";

const DEFAULT_GST_RATE = 0.05;

type Booking = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>>;
type DestPrice = { serviceDiff: number; returnDiff: number; increment: number; gstIncrement: number; charge: number };

const stopsOf = (b: Booking) => (Array.isArray(b.stops) ? (b.stops as string[]) : []);

async function priceDestination(booking: Booking, dropoff: string) {
  const stops   = stopsOf(booking);
  const pricing = await prisma.pricingConfig.findFirst().catch(() => null);
  const gstRate = pricing?.gstRate ?? DEFAULT_GST_RATE;
  const isCare  = booking.bookingType === "CARE";

  const rates = isCare
    ? await getSafeRideServiceRates()
    : await prisma.vehicleTierConfig.findFirst({
        where: { tier: { equals: normalizeTier(booking.carTier), mode: "insensitive" } },
        select: { ratePerKm: true, ratePerMin: true },
      }).catch(() => null) ?? { ratePerKm: 1.25, ratePerMin: 0.25 };

  const [before, after] = await Promise.all([
    routeVia([booking.pickup, ...stops, booking.dropoff]),
    routeVia([booking.pickup, ...stops, dropoff]),
  ]);
  if (!before || !after) return null;
  const serviceDiff = round2((after.km - before.km) * rates.ratePerKm + (after.min - before.min) * rates.ratePerMin);

  let returnDiff = 0;
  if (isCare && booking.careReturnAllowance != null) {
    const [backBefore, backAfter, settings] = await Promise.all([
      routeLeg(booking.dropoff, booking.pickup),
      routeLeg(dropoff, booking.pickup),
      getSafeRideSettings(),
    ]);
    if (backBefore && backAfter) {
      const snap = (booking.pricingSnapshot ?? {}) as { bufferRate?: number; demandMultiplier?: number };
      const buffer = (1 + (snap.bufferRate ?? settings.returnBufferRate)) * (snap.demandMultiplier ?? 1);
      returnDiff = round2(((backAfter.km - backBefore.km) * settings.returnPerKm + (backAfter.min - backBefore.min) * settings.returnPerMin) * buffer);
    }
  }

  /* Only increases are charged */
  const increment    = round2(Math.max(0, serviceDiff + returnDiff));
  const gstIncrement = round2(increment * gstRate);
  const charge       = round2(increment + gstIncrement);
  return {
    serviceDiff: Math.max(0, serviceDiff), returnDiff: Math.max(0, returnDiff),
    increment, gstIncrement, charge, newTotal: round2(booking.total + charge),
  };
}

async function applyDestination(booking: Booking, dropoff: string, p: DestPrice) {
  const isCare = booking.bookingType === "CARE";
  let payoutIncrement = 0;
  if (isCare && booking.chauffeurPayout != null && p.serviceDiff > 0) {
    const snapRate = (booking.pricingSnapshot as { payoutRate?: number } | null)?.payoutRate;
    const rate = typeof snapRate === "number" ? snapRate : (await getSafeRideSettings()).chauffeurPayoutRate;
    payoutIncrement = round2(p.serviceDiff * rate);
  }
  const coords = await geocodeAddress(dropoff).catch(() => null);
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      dropoff,
      dropoffLat: coords?.lat ?? null,
      dropoffLng: coords?.lng ?? null,
      ...(p.charge > 0 ? {
        fare:  { increment: p.increment },
        gst:   { increment: p.gstIncrement },
        total: { increment: p.charge },
      } : {}),
      ...(isCare && p.serviceDiff > 0 && booking.careServicePortion != null ? { careServicePortion: { increment: p.serviceDiff } } : {}),
      ...(isCare && p.returnDiff > 0 && booking.careReturnAllowance != null ? { careReturnAllowance: { increment: p.returnDiff } } : {}),
      ...(payoutIncrement ? { chauffeurPayout: { increment: payoutIncrement } } : {}),
    },
  });
  await notifyRouteChange(booking, { dropoff, stops: stopsOf(booking) }, "destination", `Destination changed to ${dropoff}`);
  return updated;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const confirmedIntentId = body?.confirmedIntentId as string | undefined;
    const dropoff = typeof body?.dropoff === "string" ? body.dropoff.trim().slice(0, 200) : "";

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json({ error: "Ride is no longer active" }, { status: 409 });
    }
    if (booking.paymentStatus !== "PAID") return NextResponse.json({ error: "Booking is not paid" }, { status: 409 });

    /* 3DS completed — apply exactly what was charged */
    if (confirmedIntentId) {
      const intent = await stripe.paymentIntents.retrieve(confirmedIntentId);
      const m = intent.metadata ?? {};
      if (intent.status !== "succeeded" || m.bookingId !== id || m.kind !== "destination_change") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
      }
      if (m.applied === "1") return NextResponse.json({ ok: true, charged: Number(m.charge) });
      const updated = await applyDestination(booking, m.dropoff, {
        serviceDiff: Number(m.serviceDiff), returnDiff: Number(m.returnDiff), increment: Number(m.increment),
        gstIncrement: Number(m.gstIncrement), charge: Number(m.charge),
      });
      await stripe.paymentIntents.update(confirmedIntentId, { metadata: { applied: "1" } }).catch(() => {});
      return NextResponse.json({ ok: true, charged: Number(m.charge), booking: updated });
    }

    if (!dropoff) return NextResponse.json({ error: "Please enter the new destination" }, { status: 400 });
    if (dropoff === booking.dropoff) return NextResponse.json({ error: "That's already your destination" }, { status: 409 });

    const price = await priceDestination(booking, dropoff);
    if (!price) return NextResponse.json({ error: "We couldn't find a route to that address. Please check it and try again." }, { status: 400 });

    if (body?.quoteOnly) return NextResponse.json({ ok: true, ...price });

    /* Nothing extra to pay — just update the ride */
    if (price.charge <= 0) {
      const updated = await applyDestination(booking, dropoff, price);
      return NextResponse.json({ ok: true, charged: 0, booking: updated });
    }

    const result = await chargeRideExtra({
      booking, userId: session.userId, charge: price.charge,
      description: `Destination change — booking ${booking.bookingNumber ?? id}`,
      metadata: {
        bookingId: id, kind: "destination_change", dropoff,
        serviceDiff: String(price.serviceDiff), returnDiff: String(price.returnDiff),
        increment: String(price.increment), gstIncrement: String(price.gstIncrement), charge: String(price.charge),
      },
    });
    if (result.status === "failed") return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    if (result.status === "requires_action") {
      return NextResponse.json({ requiresAction: true, clientSecret: result.clientSecret, intentId: result.intentId, charge: price.charge });
    }

    const updated = await applyDestination(booking, dropoff, price);
    await stripe.paymentIntents.update(result.intentId, { metadata: { applied: "1" } }).catch(() => {});
    return NextResponse.json({ ok: true, charged: price.charge, booking: updated });
  } catch (e) {
    console.error("[destination]", e);
    return NextResponse.json({ error: "Failed to change destination" }, { status: 500 });
  }
}
