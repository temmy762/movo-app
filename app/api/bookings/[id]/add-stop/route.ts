/**
 * POST /api/bookings/[id]/add-stop
 *
 * Add a stop during an active ride. Two steps, so the rider always sees the
 * price before paying:
 *   { stopAddress, quoteOnly: true }  → the extra cost (reroute distance/time
 *                                       at the ride's rates + stop fee, + GST)
 *   { stopAddress }                   → charge exactly that and add the stop
 *
 * A 3DS challenge comes back to the client (requiresAction + clientSecret);
 * the client confirms and calls back with confirmedIntentId, and the stop is
 * added using the amounts recorded on that PaymentIntent. The chauffeur's
 * screen updates live.
 *
 * Safe Ride: the extra is part of the chauffeur's work, so it's added to the
 * service portion and the chauffeur's payout grows by their share of it.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { routeVia } from "@/lib/routing";
import { normalizeTier } from "@/lib/normalizeTier";
import { getSafeRideServiceRates, getSafeRideSettings } from "@/lib/safeRide";
import { chargeRideExtra, notifyRouteChange, round2, stripe } from "@/lib/rideChanges";

const DEFAULT_ADDITIONAL_STOP_FEE = 5.00;
const DEFAULT_GST_RATE            = 0.05;
const MAX_STOPS                   = 3;

type Booking = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>>;
type StopPrice = { increment: number; reroute: number; stopFee: number; gstIncrement: number; charge: number };

const stopsOf = (b: Booking) => (Array.isArray(b.stops) ? (b.stops as string[]) : []);

/* Extra the stop adds: reroute through it at the ride's per-km/min rates,
   plus the per-stop fee. Falls back to just the stop fee if Google can't route. */
async function priceStop(booking: Booking, stopAddress: string) {
  const existing = stopsOf(booking);
  const pricing  = await prisma.pricingConfig.findFirst().catch(() => null);
  const stopFee  = round2(pricing?.additionalStopFee ?? DEFAULT_ADDITIONAL_STOP_FEE);
  const gstRate  = pricing?.gstRate ?? DEFAULT_GST_RATE;

  const rates = booking.bookingType === "CARE"
    ? await getSafeRideServiceRates()
    : await prisma.vehicleTierConfig.findFirst({
        where: { tier: { equals: normalizeTier(booking.carTier), mode: "insensitive" } },
        select: { ratePerKm: true, ratePerMin: true },
      }).catch(() => null) ?? { ratePerKm: 1.25, ratePerMin: 0.25 };

  const [before, after] = await Promise.all([
    routeVia([booking.pickup, ...existing, booking.dropoff]),
    routeVia([booking.pickup, ...existing, stopAddress, booking.dropoff]),
  ]);
  const extraKm  = before && after ? Math.max(0, after.km - before.km) : 0;
  const extraMin = before && after ? Math.max(0, after.min - before.min) : 0;
  const reroute  = round2(extraKm * rates.ratePerKm + extraMin * rates.ratePerMin);

  const increment    = round2(reroute + stopFee);   /* pre-GST */
  const gstIncrement = round2(increment * gstRate);
  const charge       = round2(increment + gstIncrement);
  return { increment, reroute, stopFee, gstIncrement, charge, newTotal: round2(booking.total + charge), routed: !!(before && after) };
}

async function applyStop(booking: Booking, stopAddress: string, amounts: StopPrice) {
  const isCare = booking.bookingType === "CARE";
  let payoutIncrement = 0;
  if (isCare && booking.chauffeurPayout != null) {
    const snapRate = (booking.pricingSnapshot as { payoutRate?: number } | null)?.payoutRate;
    const rate = typeof snapRate === "number" ? snapRate : (await getSafeRideSettings()).chauffeurPayoutRate;
    payoutIncrement = round2(amounts.increment * rate);
  }
  const stops = [...stopsOf(booking), stopAddress];
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stops,
      gst:   { increment: amounts.gstIncrement },
      total: { increment: amounts.charge },
      ...(isCare
        ? {
            /* Safe Ride shows one fare: the extra joins the fare + service portion */
            fare: { increment: amounts.increment },
            ...(booking.careServicePortion != null ? { careServicePortion: { increment: amounts.increment } } : {}),
            ...(payoutIncrement ? { chauffeurPayout: { increment: payoutIncrement } } : {}),
          }
        : {
            fare: { increment: amounts.reroute },
            additionalStopFee: { increment: amounts.stopFee },
          }),
    },
  });
  await notifyRouteChange(booking, { dropoff: booking.dropoff, stops }, "stop_added", `New stop added: ${stopAddress}`);
  return updated;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const confirmedIntentId = body?.confirmedIntentId as string | undefined;
    const stopAddress = typeof body?.stopAddress === "string" ? body.stopAddress.trim().slice(0, 200) : "";

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json({ error: "Ride is no longer active" }, { status: 409 });
    }
    if (booking.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Booking is not paid" }, { status: 409 });
    }

    /* ── Client completed a 3DS challenge — apply exactly what was charged ── */
    if (confirmedIntentId) {
      const intent = await stripe.paymentIntents.retrieve(confirmedIntentId);
      const m = intent.metadata ?? {};
      if (intent.status !== "succeeded" || m.bookingId !== id || m.kind !== "additional_stop") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
      }
      if (m.applied === "1") return NextResponse.json({ ok: true, charged: Number(m.charge) });
      const updated = await applyStop(booking, m.stopAddress, {
        increment: Number(m.increment), reroute: Number(m.reroute), stopFee: Number(m.stopFee),
        gstIncrement: Number(m.gstIncrement), charge: Number(m.charge),
      });
      await stripe.paymentIntents.update(confirmedIntentId, { metadata: { applied: "1" } }).catch(() => {});
      return NextResponse.json({ ok: true, charged: Number(m.charge), booking: updated });
    }

    if (!stopAddress) {
      return NextResponse.json({ error: "Please enter the stop address" }, { status: 400 });
    }
    const existing = stopsOf(booking);
    if (existing.length >= MAX_STOPS) {
      return NextResponse.json({ error: `You can add up to ${MAX_STOPS} stops` }, { status: 409 });
    }
    if (existing.includes(stopAddress)) {
      return NextResponse.json({ error: "That stop is already on your route" }, { status: 409 });
    }

    const price = await priceStop(booking, stopAddress);

    /* ── Step 1: show the price before anything is charged ── */
    if (body?.quoteOnly) {
      return NextResponse.json({ ok: true, ...price });
    }

    /* ── Step 2: charge the quoted increment ── */
    const result = await chargeRideExtra({
      booking, userId: session.userId, charge: price.charge,
      description: `Additional stop — booking ${booking.bookingNumber ?? id}`,
      /* Amounts recorded here so a 3DS callback applies exactly what was charged */
      metadata: {
        bookingId: id, kind: "additional_stop", stopAddress,
        increment: String(price.increment), reroute: String(price.reroute), stopFee: String(price.stopFee),
        gstIncrement: String(price.gstIncrement), charge: String(price.charge),
      },
    });
    if (result.status === "failed") return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    if (result.status === "requires_action") {
      return NextResponse.json({ requiresAction: true, clientSecret: result.clientSecret, intentId: result.intentId, charge: price.charge });
    }

    const updated = await applyStop(booking, stopAddress, price);
    await stripe.paymentIntents.update(result.intentId, { metadata: { applied: "1" } }).catch(() => {});
    return NextResponse.json({ ok: true, charged: price.charge, booking: updated });
  } catch (e) {
    console.error("[add-stop]", e);
    return NextResponse.json({ error: "Failed to add stop" }, { status: 500 });
  }
}
