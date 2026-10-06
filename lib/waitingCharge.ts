import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/**
 * Waiting ends when the trip starts: bill (arrival → start) minus the free
 * window, in whole minutes, charged off-session to the card on file.
 *
 * Shared by standard rides (global PricingConfig rates) and Safe Ride
 * (SafeRideConfig rates). Returns the pre-GST waiting fee recorded.
 */
export async function settleWaitingCharge(opts: {
  booking: { id: string; userId: string | null; stripePaymentIntentId: string | null; paymentStatus: string };
  arrivedAt: Date | null;
  startedAt: Date;
  freeMinutes: number;
  ratePerMin: number;
  gstRate: number;
}): Promise<number> {
  const { booking, arrivedAt, startedAt, freeMinutes, ratePerMin, gstRate } = opts;
  if (!arrivedAt || booking.paymentStatus !== "PAID") return 0;

  const waitedMin   = Math.floor((startedAt.getTime() - arrivedAt.getTime()) / 60_000);
  const billableMin = Math.max(0, waitedMin - freeMinutes);
  if (billableMin === 0) return 0;

  const waitingFee   = parseFloat((billableMin * ratePerMin).toFixed(2));
  const gstIncrement = parseFloat((waitingFee * gstRate).toFixed(2));
  const chargeAmount = parseFloat((waitingFee + gstIncrement).toFixed(2));

  /* Record on the booking regardless of charge outcome — the receipt and
     admin reconciliation both read from here */
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      waitingFee: { increment: waitingFee },
      gst:        { increment: gstIncrement },
      total:      { increment: chargeAmount },
    },
  });

  /* Charge the card used at booking (off-session — the rider is getting in
     the car, not staring at a payment sheet) */
  try {
    const user = booking.userId
      ? await prisma.user.findUnique({ where: { id: booking.userId }, select: { stripeCustomerId: true } })
      : null;
    let paymentMethodId: string | null = null;
    if (booking.stripePaymentIntentId) {
      const original = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId).catch(() => null);
      if (original && typeof original.payment_method === "string") paymentMethodId = original.payment_method;
    }
    if (!paymentMethodId && user?.stripeCustomerId) {
      const methods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card", limit: 1 });
      paymentMethodId = methods.data[0]?.id ?? null;
    }
    if (!user?.stripeCustomerId || !paymentMethodId) throw new Error("No saved payment method");

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(chargeAmount * 100),
      currency: "cad",
      customer: user.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `Waiting time (${billableMin} min) — booking ${booking.id}`,
      metadata: { bookingId: booking.id, kind: "waiting_time" },
    });
    if (intent.status !== "succeeded") throw new Error(`Intent status ${intent.status}`);
  } catch (chargeErr) {
    console.error("[waiting charge] charge failed:", chargeErr);
    notifyAdmins(
      "ADMIN_PAYOUT_REQUEST",
      {
        title: "Waiting charge failed",
        message: `Waiting fee $${chargeAmount.toFixed(2)} for booking ${booking.id} could not be charged automatically — collect manually.`,
        bookingId: booking.id,
      },
      ["IN_APP"],
    ).catch(() => {});
  }
  return waitingFee;
}
