/**
 * Refund a booking across ALL of its card payments: the checkout payment plus
 * any extra charges taken during the ride (added stops, destination changes,
 * waiting time — each is its own PaymentIntent tagged metadata.bookingId).
 *
 * Refunding only the checkout payment missed those extras, and a partial
 * refund larger than the checkout payment was rejected by Stripe outright —
 * leaving the ride cancelled with nothing refunded.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

type Refundable = { id: string; remaining: number }; /* cents */

async function refundablePayments(bookingId: string, checkoutIntentId: string | null): Promise<Refundable[]> {
  const ids = new Set<string>();
  if (checkoutIntentId) ids.add(checkoutIntentId);
  try {
    const found = await stripe.paymentIntents.search({
      query: `metadata['bookingId']:'${bookingId}' AND status:'succeeded'`,
      limit: 20,
    });
    for (const pi of found.data) ids.add(pi.id);
  } catch (e) {
    console.error("[refund] extra-charge search failed — refunding checkout payment only:", e);
  }

  const out: Refundable[] = [];
  for (const id of ids) {
    const pi = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] }).catch(() => null);
    if (!pi || pi.status !== "succeeded") continue;
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    const remaining = (pi.amount_received ?? 0) - (charge?.amount_refunded ?? 0);
    if (remaining > 0) out.push({ id, remaining });
  }
  /* Checkout payment first, then extras */
  return out.sort((a, b) => (a.id === checkoutIntentId ? -1 : b.id === checkoutIntentId ? 1 : 0));
}

/**
 * @param amount Dollars to refund; omit for everything still refundable.
 * @returns ids of the refunds made and the dollars actually refunded.
 */
export async function refundBooking(opts: {
  bookingId: string;
  checkoutIntentId: string | null;
  amount?: number;
}): Promise<{ refundIds: string[]; refunded: number }> {
  const payments = await refundablePayments(opts.bookingId, opts.checkoutIntentId);
  let left = opts.amount != null ? Math.round(opts.amount * 100) : Number.POSITIVE_INFINITY;
  const refundIds: string[] = [];
  let refundedCents = 0;

  for (const p of payments) {
    if (left <= 0) break;
    const cents = Math.min(p.remaining, left);
    const refund = await stripe.refunds.create({
      payment_intent: p.id,
      ...(cents < p.remaining ? { amount: cents } : {}),
      metadata: { bookingId: opts.bookingId },
    });
    refundIds.push(refund.id);
    refundedCents += cents;
    left -= cents;
  }
  if (!refundIds.length) throw new Error("Nothing refundable for this booking");
  return { refundIds, refunded: refundedCents / 100 };
}
