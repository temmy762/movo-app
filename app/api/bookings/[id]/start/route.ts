import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchTripStarted } from "@/lib/socket/dispatcher";
import { notifyAdmins } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const DEFAULT_FREE_WAITING_MINUTES = 5;
const DEFAULT_WAITING_RATE_PER_MIN = 0.75;

/* Waiting ends when the trip starts: bill (arrival → start) minus the free
   window, in whole minutes, charged off-session to the card on file. */
async function settleWaitingCharge(booking: {
  id: string; userId: string | null; arrivedAt: Date | null;
  stripePaymentIntentId: string | null; paymentStatus: string;
}, startedAt: Date): Promise<number> {
  if (!booking.arrivedAt || booking.paymentStatus !== "PAID") return 0;

  const pricing = await prisma.pricingConfig.findFirst().catch(() => null);
  const freeMin = pricing?.freeWaitingMinutes ?? DEFAULT_FREE_WAITING_MINUTES;
  const rate    = pricing?.waitingRatePerMin  ?? DEFAULT_WAITING_RATE_PER_MIN;
  const gstRate = pricing?.gstRate ?? 0.05;

  const waitedMin  = Math.floor((startedAt.getTime() - booking.arrivedAt.getTime()) / 60_000);
  const billableMin = Math.max(0, waitedMin - freeMin);
  if (billableMin === 0) return 0;

  const waitingFee   = parseFloat((billableMin * rate).toFixed(2));
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
    console.error("[start] waiting charge failed:", chargeErr);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, driverId: session.driverId, status: "CONFIRMED" },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found or not in CONFIRMED state" }, { status: 404 });
  }

  if (booking.startedAt) {
    return NextResponse.json({ error: "Trip already started" }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data:  { startedAt: new Date() },
  });

  /* Bill any wait time beyond the free window (fire-and-forget) */
  settleWaitingCharge(booking, updated.startedAt!).catch((e) =>
    console.error("[start] waiting settlement failed:", e),
  );

  /* Socket: instantly notify rider + admin the trip has started */
  dispatchTripStarted({
    bookingId,
    driverId:  booking.driverId,
    userId:    booking.userId,
    startedAt: updated.startedAt!.toISOString(),
  });

  return NextResponse.json({ ok: true, startedAt: updated.startedAt });
}
