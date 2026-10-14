import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { ensureReceiptNumber } from "@/lib/references";
import { scheduleOrphanPaymentCheck } from "@/lib/payments/orphanPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {

      /* ── Payment succeeded ── */
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        /* Booking creation already verifies the payment, sends the booking
           confirmation and issues the receipt number; the itemised receipt is
           sent at completion. This only backstops the PAID flag + receipt
           number. It must NOT change the booking status (that marked Safe Rides
           "confirmed" before any chauffeur accepted) or email again (riders got
           duplicate confirmations and an early receipt). */
        await prisma.booking.updateMany({
          where: { stripePaymentIntentId: intent.id, paymentStatus: { not: "PAID" } },
          data: { paymentStatus: "PAID" },
        });
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: intent.id },
          select: { id: true },
        });
        if (booking) await ensureReceiptNumber(booking.id);
        /* Checkout paid but no booking yet — refund later if it never appears */
        else if (intent.metadata?.purpose === "booking") scheduleOrphanPaymentCheck(intent.id);
        break;
      }

      /* ── Payment failed ── */
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.booking.updateMany({
          where: {
            stripePaymentIntentId: intent.id,
            paymentStatus: { not: "PAID" },
          },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: "stripe_failed",
          },
        });
        break;
      }

      /* ── Charge fully refunded (e.g. via Stripe dashboard) ── */
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        /* Fires for partial refunds too — only a full refund marks it refunded */
        if (charge.refunded && charge.payment_intent && typeof charge.payment_intent === "string") {
          await prisma.booking.updateMany({
            where: {
              stripePaymentIntentId: charge.payment_intent,
              paymentStatus: { not: "REFUNDED" },
            },
            data: { paymentStatus: "REFUNDED" },
          });
        }
        break;
      }

      /* ── Dispute opened ── */
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
        if (chargeId) {
          /* Retrieve the charge to get the payment_intent */
          const charge = await stripe.charges.retrieve(chargeId, { expand: ["payment_intent"] });
          const intentId = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

          if (intentId) {
            /* Flag the booking with a note — no status change, admin must review */
            const booking = await prisma.booking.findFirst({
              where: { stripePaymentIntentId: intentId },
              select: { id: true },
            });
            if (booking) {
              console.warn(`[Stripe] Dispute opened on booking ${booking.id} — dispute ID: ${dispute.id}`);
            }
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", err);
    /* Still return 200 so Stripe doesn't retry endlessly */
  }

  return NextResponse.json({ received: true });
}
