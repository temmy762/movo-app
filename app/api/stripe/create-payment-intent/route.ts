import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const { amount, idempotencyKey } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const createOptions: Stripe.RequestOptions = {};
    if (idempotencyKey && typeof idempotencyKey === "string") {
      createOptions.idempotencyKey = idempotencyKey;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: "cad",
        automatic_payment_methods: { enabled: true },
      },
      createOptions
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
