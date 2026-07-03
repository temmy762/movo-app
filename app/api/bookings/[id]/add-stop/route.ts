/**
 * POST /api/bookings/[id]/add-stop
 *
 * Add an additional stop during an active ride and CHARGE the fare difference.
 * Payment is upfront, so the increment (stop fee + GST) is collected against
 * the card used for the original booking (falling back to the customer's
 * first saved card). Previously the UI only PATCHed the DB totals — the fare
 * changed on paper but no money was ever collected.
 *
 * On-session: the rider is present, so 3DS challenges come back to the client
 * (requires_action + clientSecret) and the booking is only updated after the
 * client confirms and calls back with confirmedIntentId.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const DEFAULT_ADDITIONAL_STOP_FEE = 5.00;
const DEFAULT_GST_RATE            = 0.05;

async function applyStopToBooking(bookingId: string, stopFee: number, gstIncrement: number) {
  const increment = parseFloat((stopFee + gstIncrement).toFixed(2));
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      additionalStopFee: { increment: stopFee },
      gst:               { increment: gstIncrement },
      total:             { increment },
    },
  });
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

    const pricing = await prisma.pricingConfig.findFirst().catch(() => null);
    const stopFee = parseFloat((pricing?.additionalStopFee ?? DEFAULT_ADDITIONAL_STOP_FEE).toFixed(2));
    const gstRate = pricing?.gstRate ?? DEFAULT_GST_RATE;
    const gstIncrement = parseFloat((stopFee * gstRate).toFixed(2));
    const chargeAmount = parseFloat((stopFee + gstIncrement).toFixed(2));

    /* ── Client already completed a 3DS challenge — verify and apply ── */
    if (confirmedIntentId) {
      const intent = await stripe.paymentIntents.retrieve(confirmedIntentId);
      if (intent.status !== "succeeded" || intent.metadata?.bookingId !== id) {
        return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
      }
      const updated = await applyStopToBooking(id, stopFee, gstIncrement);
      return NextResponse.json({ ok: true, charged: chargeAmount, booking: updated });
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
        { error: "No saved payment method available to charge the stop fee. Please contact support." },
        { status: 402 }
      );
    }

    /* ── Charge the increment ── */
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount:   Math.round(chargeAmount * 100),
        currency: "cad",
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: false,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        description: `Additional stop — booking ${id}`,
        metadata: { bookingId: id, kind: "additional_stop" },
      });
    } catch (chargeErr) {
      const message = chargeErr instanceof Error ? chargeErr.message : "Card charge failed";
      console.error("[add-stop] charge failed:", message);
      return NextResponse.json({ error: `Couldn't charge your card: ${message}` }, { status: 402 });
    }

    if (intent.status === "requires_action") {
      /* 3DS challenge — client completes it, then calls back with confirmedIntentId */
      return NextResponse.json({ requiresAction: true, clientSecret: intent.client_secret, intentId: intent.id, charge: chargeAmount });
    }
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment could not be completed" }, { status: 402 });
    }

    const updated = await applyStopToBooking(id, stopFee, gstIncrement);
    return NextResponse.json({ ok: true, charged: chargeAmount, booking: updated });
  } catch (e) {
    console.error("[add-stop]", e);
    return NextResponse.json({ error: "Failed to add stop" }, { status: 500 });
  }
}
