import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

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
        await prisma.booking.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });

        /* Fire payment receipt email */
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: intent.id },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        });

        if (booking?.user?.email) {
          // Booking confirmed email
          sendNotification({
            eventType: "RIDER_BOOKING_CONFIRMED",
            recipient: {
              type: "user",
              id: booking.user.id,
              email: booking.user.email,
              firstName: booking.user.firstName,
              lastName: booking.user.lastName ?? undefined,
            },
            data: {
              bookingId: booking.id,
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              carTier: booking.carTier,
              fare: booking.fare,
              serviceFee: booking.serviceFee,
              total: booking.total,
            },
          }).catch((e) => console.error("[webhook] booking confirmed email failed:", e));

          // Payment receipt email
          sendNotification({
            eventType: "RIDER_PAYMENT_RECEIPT",
            recipient: {
              type: "user",
              id: booking.user.id,
              email: booking.user.email,
              firstName: booking.user.firstName,
              lastName: booking.user.lastName ?? undefined,
            },
            data: {
              bookingId: booking.id,
              paymentId: intent.id,
              amount: booking.total,
              method: "Card",
              date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
              items: [
                { label: "Ride Fare", amount: booking.fare },
                { label: "Service Fee", amount: booking.serviceFee },
              ],
            },
          }).catch((e) => console.error("[webhook] receipt email failed:", e));
        }
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
        if (charge.payment_intent && typeof charge.payment_intent === "string") {
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
