import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOrCreateStripeCustomer } from "@/lib/stripeCustomer";
import { verifyFareQuote } from "@/lib/fareQuote";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const { quote: quoteToken, idempotencyKey } = await req.json();

    /* Charge exactly the server-signed price — never an amount from the
       browser — so the payment always matches what booking creation verifies */
    const quote = verifyFareQuote(quoteToken);
    if (!quote) {
      return NextResponse.json({ error: "Your fare quote has expired. Please refresh the page." }, { status: 400 });
    }
    const amount = quote.total;

    /* Attach Stripe customer if user is authenticated */
    let customerId: string | undefined;
    let userId: string | undefined;
    try {
      const session = await getSession(req);
      userId = session?.userId ?? undefined;
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
        /* Lets booking creation prove this rider owns the payment */
        metadata: { purpose: "booking", ...(userId ? { userId } : {}) },
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
