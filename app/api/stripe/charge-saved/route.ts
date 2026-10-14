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
import { verifyFareQuote } from "@/lib/fareQuote";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quote: quoteToken, paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: "paymentMethodId required" }, { status: 400 });
    }
    /* Charge exactly the server-signed price, never a browser amount */
    const quote = verifyFareQuote(quoteToken);
    if (!quote) {
      return NextResponse.json({ error: "Your fare quote has expired. Please refresh the page." }, { status: 400 });
    }
    const amount = quote.total;

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
      metadata: { purpose: "booking", userId: session.userId },
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
