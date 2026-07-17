import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOrCreateStripeCustomer } from "@/lib/stripeCustomer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const { amount, idempotencyKey } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    /* Attach Stripe customer if user is authenticated */
    let customerId: string | undefined;
    try {
      const session = await getSession(req);
      if (session?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, email: true, firstName: true, lastName: true, stripeCustomerId: true },
        });
        if (user) {
          /* Validates the stored id against the CURRENT Stripe mode and
             recreates it when stale (test-mode ids after the live switch) */
          customerId = await getOrCreateStripeCustomer(stripe, user);
        }
      }
    } catch { /* non-fatal — proceed without customer */ }

    const createOptions: Stripe.RequestOptions = {};
    if (idempotencyKey && typeof idempotencyKey === "string") {
      createOptions.idempotencyKey = idempotencyKey;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: "cad",
        automatic_payment_methods: { enabled: true },
        /* Save the card to the customer for future bookings + mid-ride charges
           (additional stops). Without this, cards were never attached and the
           "saved payment methods" list stayed empty forever. */
        ...(customerId ? { customer: customerId, setup_future_usage: "off_session" } : {}),
      },
      createOptions
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
