/**
 * POST /api/bookings/[id]/add-stop
 *
 * Add a stop during an active ride. Two steps, so the rider always sees the
 * price before paying:
 *   { stopAddress, quoteOnly: true }  → the extra cost (reroute distance/time
 *                                       at the ride's rates + stop fee, + GST)
 *   { stopAddress }                   → charge exactly that and add the stop
 *
 * Payment is upfront, so the increment is charged on-session to the card used
 * for the booking (falling back to the customer's first saved card). A 3DS
 * challenge comes back to the client (requires_action + clientSecret); the
 * client confirms and calls back with confirmedIntentId, and the stop is added
 * using the amounts recorded on that PaymentIntent.
 *
 * Safe Ride: the extra is part of the chauffeur's work, so it's added to the
 * service portion and the chauffeur's payout grows by their share of it.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { routeVia } from "@/lib/routing";
import { normalizeTier } from "@/lib/normalizeTier";
import { getSafeRideServiceRates, getSafeRideSettings } from "@/lib/safeRide";
import { pushToDriver } from "@/lib/webpush";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const DEFAULT_ADDITIONAL_STOP_FEE = 5.00;
const DEFAULT_GST_RATE            = 0.05;
const MAX_STOPS                   = 3;
const round2 = (n: number) => Math.round(parseFloat((n * 100).toFixed(6))) / 100;

type Booking = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>>;

/* Extra the stop adds: reroute through it at the ride's per-km/min rates,
   plus the per-stop fee. Falls back to just the stop fee if Google can't route. */
async function priceStop(booking: Booking, stopAddress: string) {
  const existing = Array.isArray(booking.stops) ? (booking.stops as string[]) : [];
  const pricing  = await prisma.pricingConfig.findFirst().catch(() => null);
  const stopFee  = round2(pricing?.additionalStopFee ?? DEFAULT_ADDITIONAL_STOP_FEE);
  const gstRate  = pricing?.gstRate ?? DEFAULT_GST_RATE;

  const isCare = booking.bookingType === "CARE";
  const rates = isCare
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

async function applyStop(booking: Booking, stopAddress: string, amounts: { increment: number; reroute: number; stopFee: number; gstIncrement: number; charge: number }) {
  const existing = Array.isArray(booking.stops) ? (booking.stops as string[]) : [];
  const isCare = booking.bookingType === "CARE";
  let payoutIncrement = 0;
  if (isCare && booking.chauffeurPayout != null) {
    const snapRate = (booking.pricingSnapshot as { payoutRate?: number } | null)?.payoutRate;
    const rate = typeof snapRate === "number" ? snapRate : (await getSafeRideSettings()).chauffeurPayoutRate;
    payoutIncrement = round2(amounts.increment * rate);
  }
  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      stops: [...existing, stopAddress],
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
}

/* Let the chauffeur know where the new stop is */
async function notifyChauffeur(booking: Booking, stopAddress: string) {
  let driverId = booking.driverId;
  if (!driverId && booking.bookingType === "CARE") {
    const primary = await prisma.careAssignment.findFirst({
      where: { bookingId: booking.id, role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED"] } },
      select: { driverId: true },
    });
    driverId = primary?.driverId ?? null;
  }
  if (!driverId) return;
  pushToDriver(driverId, {
    title: "Stop added to your ride",
    body:  `New stop: ${stopAddress}`,
    tag:   `stop-${booking.id}`,
    data:  { type: "stop_added", bookingId: booking.id, requireInteraction: "true" },
  }).catch(() => {});
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
      notifyChauffeur(booking, m.stopAddress).catch(() => {});
      return NextResponse.json({ ok: true, charged: Number(m.charge), booking: updated });
    }

    if (!stopAddress) {
      return NextResponse.json({ error: "Please enter the stop address" }, { status: 400 });
    }
    const existing = Array.isArray(booking.stops) ? (booking.stops as string[]) : [];
    if (existing.length >= MAX_STOPS) {
      return NextResponse.json({ error: `You can add up to ${MAX_STOPS} stops` }, { status: 409 });
    }

    const price = await priceStop(booking, stopAddress);

    /* ── Step 1: show the price before anything is charged ── */
    if (body?.quoteOnly) {
      return NextResponse.json({ ok: true, ...price });
    }

    /* ── Resolve a chargeable payment method ── */
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { stripeCustomerId: true },
    });

    let paymentMethodId: string | null = null;
    if (booking.stripePaymentIntentId) {
      try {
        const originalIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
        if (typeof originalIntent.payment_method === "string") paymentMethodId = originalIntent.payment_method;
      } catch { /* fall through to saved cards */ }
    }
    if (!paymentMethodId && user?.stripeCustomerId) {
      const methods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card", limit: 1 });
      paymentMethodId = methods.data[0]?.id ?? null;
    }
    if (!user?.stripeCustomerId || !paymentMethodId) {
      return NextResponse.json(
        { error: "No saved payment method available to charge the stop. Please contact support." },
        { status: 402 }
      );
    }

    /* ── Step 2: charge the quoted increment ── */
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount:   Math.round(price.charge * 100),
        currency: "cad",
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: false,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        description: `Additional stop — booking ${id}`,
        /* Amounts recorded here so a 3DS callback applies exactly what was charged */
        metadata: {
          bookingId: id, kind: "additional_stop", stopAddress,
          increment: String(price.increment), reroute: String(price.reroute), stopFee: String(price.stopFee),
          gstIncrement: String(price.gstIncrement), charge: String(price.charge),
        },
      });
    } catch (chargeErr) {
      const message = chargeErr instanceof Error ? chargeErr.message : "Card charge failed";
      console.error("[add-stop] charge failed:", message);
      return NextResponse.json({ error: `Couldn't charge your card: ${message}` }, { status: 402 });
    }

    if (intent.status === "requires_action") {
      return NextResponse.json({ requiresAction: true, clientSecret: intent.client_secret, intentId: intent.id, charge: price.charge });
    }
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment could not be completed" }, { status: 402 });
    }

    const updated = await applyStop(booking, stopAddress, price);
    await stripe.paymentIntents.update(intent.id, { metadata: { applied: "1" } }).catch(() => {});
    notifyChauffeur(booking, stopAddress).catch(() => {});
    return NextResponse.json({ ok: true, charged: price.charge, booking: updated });
  } catch (e) {
    console.error("[add-stop]", e);
    return NextResponse.json({ error: "Failed to add stop" }, { status: 500 });
  }
}
