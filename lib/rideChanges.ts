/**
 * Mid-trip route changes (add a stop, change destination, reorder stops):
 * charging the rider for the extra, and telling the chauffeur straight away.
 */
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { pushToDriver } from "@/lib/webpush";
import { dispatchRouteUpdated } from "@/lib/socket/dispatcher";
import { sendNotification } from "@/lib/notifications";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const round2 = (n: number) => Math.round(parseFloat((n * 100).toFixed(6))) / 100;

type BookingLite = {
  id: string; userId: string | null; driverId: string | null; bookingType: string;
  stripePaymentIntentId: string | null;
};

/** The chauffeur on this ride: booking.driverId, or Safe Ride's accepted PRIMARY */
export async function rideChauffeurId(booking: BookingLite): Promise<string | null> {
  if (booking.driverId) return booking.driverId;
  if (booking.bookingType !== "CARE") return null;
  const primary = await prisma.careAssignment.findFirst({
    where: { bookingId: booking.id, role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED"] } },
    select: { driverId: true },
  });
  return primary?.driverId ?? null;
}

/** Live update + push + in-app note to the chauffeur (and the rider's other screens) */
export async function notifyRouteChange(
  booking: BookingLite,
  route: { dropoff: string; stops: string[] },
  change: "destination" | "stop_added" | "stops_reordered",
  message: string,
) {
  const driverId = await rideChauffeurId(booking);
  dispatchRouteUpdated({ bookingId: booking.id, driverId, userId: booking.userId, ...route, change, message });
  if (!driverId) return;
  pushToDriver(driverId, {
    title: "Route updated",
    body:  message,
    tag:   `route-${booking.id}`,
    data:  { type: "route_updated", bookingId: booking.id, requireInteraction: "true" },
  }).catch(() => {});
  sendNotification({
    eventType: "CHAUFFEUR_BOOKING_ASSIGNED",
    channels: ["IN_APP"],
    recipient: { type: "driver", id: driverId },
    data: { bookingId: booking.id, title: "Route updated", message },
  }).catch(() => {});
}

export type ChargeResult =
  | { status: "succeeded"; intentId: string }
  | { status: "requires_action"; intentId: string; clientSecret: string | null }
  | { status: "failed"; error: string; httpStatus: number };

/** Charge an extra amount on-session to the card used for the booking */
export async function chargeRideExtra(opts: {
  booking: BookingLite; userId: string; charge: number; description: string; metadata: Record<string, string>;
}): Promise<ChargeResult> {
  const user = await prisma.user.findUnique({ where: { id: opts.userId }, select: { stripeCustomerId: true } });
  let paymentMethodId: string | null = null;
  if (opts.booking.stripePaymentIntentId) {
    try {
      const original = await stripe.paymentIntents.retrieve(opts.booking.stripePaymentIntentId);
      if (typeof original.payment_method === "string") paymentMethodId = original.payment_method;
    } catch { /* fall through to saved cards */ }
  }
  if (!paymentMethodId && user?.stripeCustomerId) {
    const methods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card", limit: 1 });
    paymentMethodId = methods.data[0]?.id ?? null;
  }
  if (!user?.stripeCustomerId || !paymentMethodId) {
    return { status: "failed", httpStatus: 402, error: "No saved payment method available. Please contact support." };
  }
  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(opts.charge * 100),
      currency: "cad",
      customer: user.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: opts.description,
      metadata: opts.metadata,
    });
    if (intent.status === "requires_action") return { status: "requires_action", intentId: intent.id, clientSecret: intent.client_secret };
    if (intent.status !== "succeeded") return { status: "failed", httpStatus: 402, error: "Payment could not be completed" };
    return { status: "succeeded", intentId: intent.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Card charge failed";
    return { status: "failed", httpStatus: 402, error: `Couldn't charge your card: ${message}` };
  }
}
