import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { verifyFareQuote, type FareQuote } from "@/lib/fareQuote";
import { normalizeTier } from "@/lib/normalizeTier";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

type VerifiedPayment =
  | { ok: true; quote: FareQuote; paymentIntentId: string; existingBookingId: string | null }
  | { ok: false; status: number; error: string };

/**
 * Proves a new booking was actually paid for, at the server's price.
 *
 * Checks that the fare quote is server-signed and matches the trip being
 * booked, and that the Stripe PaymentIntent succeeded for exactly the quoted
 * total, in CAD, for this rider's Stripe customer. A PaymentIntent that already
 * backs a booking of this rider's is reported via `existingBookingId` so a
 * repeated submit (e.g. reloading the 3DS return page) returns that booking
 * instead of creating a duplicate.
 */
export async function verifyBookingPayment(opts: {
  userId: string;
  quoteToken: unknown;
  paymentIntentId: unknown;
  pickup: string;
  dropoff: string;
  tier: string;
  stops?: string[];
}): Promise<VerifiedPayment> {
  const intentId = opts.paymentIntentId;
  if (typeof intentId !== "string" || !intentId.startsWith("pi_")) {
    return { ok: false, status: 402, error: "Payment is required" };
  }

  /* Checked first: a refresh or resubmit after payment must return the
     existing booking, even if the stops / quote in the browser have since
     been cleared — otherwise the rider was stuck on "looking for chauffeurs". */
  const existing = await prisma.booking.findFirst({
    where: { stripePaymentIntentId: intentId },
    select: { id: true, userId: true },
  });
  if (existing) {
    if (existing.userId !== opts.userId) {
      return { ok: false, status: 409, error: "This payment is already linked to another booking" };
    }
    const q = verifyFareQuote(opts.quoteToken);
    return { ok: true, quote: q as FareQuote, paymentIntentId: intentId, existingBookingId: existing.id };
  }

  const quote = verifyFareQuote(opts.quoteToken);
  if (!quote) {
    return { ok: false, status: 400, error: "Your fare quote has expired. Please review the price and try again." };
  }
  if (
    quote.pickup !== opts.pickup ||
    quote.dropoff !== opts.dropoff ||
    quote.tier !== normalizeTier(opts.tier) ||
    JSON.stringify(quote.stops ?? []) !== JSON.stringify(opts.stops ?? [])
  ) {
    return { ok: false, status: 400, error: "Fare quote does not match this trip" };
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(intentId);
  } catch {
    return { ok: false, status: 402, error: "Payment could not be verified" };
  }

  if (intent.status !== "succeeded") {
    return { ok: false, status: 402, error: "Payment has not completed" };
  }
  if (intent.currency !== "cad" || intent.amount_received !== Math.round(quote.total * 100)) {
    return { ok: false, status: 402, error: "Payment amount does not match the fare" };
  }

  /* create-payment-intent / charge-saved tag each intent with the rider's id
     and attach their Stripe customer; either proves ownership, so someone
     else's successful payment can't be reused. */
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { stripeCustomerId: true },
  });
  const intentCustomer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
  const ownsIntent =
    intent.metadata?.userId === opts.userId ||
    (!!intentCustomer && intentCustomer === user?.stripeCustomerId);
  if (!ownsIntent) {
    return { ok: false, status: 403, error: "Payment does not belong to this account" };
  }

  return { ok: true, quote, paymentIntentId: intentId, existingBookingId: null };
}
