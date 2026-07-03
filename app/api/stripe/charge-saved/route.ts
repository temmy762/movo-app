/**
 * POST /api/stripe/charge-saved
 *
 * Pay for a booking with one of the customer's saved payment methods.
 * On-session: the rider is present, so 3DS challenges are returned to the
 * client (requires_action + clientSecret) to complete with confirmCardPayment.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, paymentMethodId } = await req.json();
    if (!amount || typeof amount !== "number" || amount <= 0 || !paymentMethodId) {
      return NextResponse.json({ error: "amount and paymentMethodId required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No saved payment methods" }, { status: 400 });
    }

    /* Guard: the payment method must belong to this customer */
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: "cad",
      customer: user.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

    return NextResponse.json({
      id: intent.id,
      status: intent.status,
      clientSecret: intent.client_secret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[charge-saved]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
