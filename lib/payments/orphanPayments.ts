/**
 * Safety net for checkout payments that never became a booking (the browser
 * closed or lost its connection between paying and booking, and the rider
 * never came back). Checked a while after Stripe confirms the payment: if no
 * booking uses it by then, it's refunded in full and admins are told.
 */
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/* Long enough for the tracking page's automatic retries and a manual retry */
export const ORPHAN_PAYMENT_GRACE_MS = 15 * 60 * 1000;

export function scheduleOrphanPaymentCheck(paymentIntentId: string): void {
  setTimeout(() => {
    refundIfOrphaned(paymentIntentId).catch((e) => console.error("[orphan payment]", e));
  }, ORPHAN_PAYMENT_GRACE_MS);
}

async function refundIfOrphaned(paymentIntentId: string): Promise<void> {
  const booking = await prisma.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
  if (booking) return;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded" || intent.metadata?.purpose !== "booking") return;
  if ((intent.amount_received ?? 0) === 0) return;

  /* Idempotent: Stripe won't refund the same intent twice past its amount */
  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId, metadata: { reason: "no_booking_created" } },
    { idempotencyKey: `orphan-refund-${paymentIntentId}` },
  );
  const amount = (intent.amount_received / 100).toFixed(2);
  console.warn(`[orphan payment] refunded ${paymentIntentId} ($${amount}) — no booking was created`);

  notifyAdmins(
    "ADMIN_PAYOUT_REQUEST",
    {
      title: "Payment refunded — no booking created",
      message: `A checkout payment of $${amount} (${paymentIntentId}) never became a booking, so it was refunded automatically (refund ${refund.id}). Customer: ${intent.metadata?.userId ?? "unknown"}.`,
    },
    ["IN_APP"],
  ).catch(() => {});
}
