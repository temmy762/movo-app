import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, note } = await req.json();
  const requested = Number(amount);
  if (!requested || isNaN(requested) || requested <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const [completedBookings, walletTxs] = await Promise.all([
    prisma.booking.findMany({
      where: { driverId: session.driverId, status: "COMPLETED", paymentStatus: "PAID" },
      select: { fare: true },
    }),
    prisma.walletTransaction.findMany({
      where: { driverId: session.driverId },
      select: { type: true, status: true, amount: true },
    }),
  ]);

  const earned   = completedBookings.reduce((s, b) => s + b.fare, 0);
  const topups   = walletTxs.filter(t => t.type === "TOPUP"   && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const payouts  = walletTxs.filter(t => t.type === "PAYOUT"  && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const earnings = walletTxs.filter(t => t.type === "EARNING" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);

  const availableBalance = earned + topups + earnings - payouts;

  if (requested > availableBalance) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` },
      { status: 400 }
    );
  }

  /* Use Stripe Connect automatic payout if the driver is connected */
  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { stripeAccountId: true, stripeAccountStatus: true },
  });

  if (driver?.stripeAccountId && driver.stripeAccountStatus === "active") {
    /* Delegate to the Stripe Connect payout route logic inline */
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
    const transfer = await stripe.transfers.create({
      amount:      Math.round(requested * 100),
      currency:    "gbp",
      destination: driver.stripeAccountId,
    });
    const tx = await prisma.walletTransaction.create({
      data: {
        driverId: session.driverId,
        type:     "PAYOUT",
        status:   "COMPLETED",
        amount:   requested,
        note:     `Bank transfer via Stripe Connect — ref ${transfer.id}`,
      },
    });
    return NextResponse.json({ ...tx, automated: true, transferId: transfer.id });
  }

  /* Manual payout — admin approval required */
  const tx = await prisma.walletTransaction.create({
    data: {
      driverId: session.driverId,
      type: "PAYOUT",
      status: "PENDING",
      amount: requested,
      note: note ?? "Send to bank",
    },
  });

  return NextResponse.json(tx);
}
