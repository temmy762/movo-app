import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/**
 * POST — Initiate an automated Stripe Connect transfer to the driver's bank.
 * The driver must have a connected Stripe account with charges_enabled.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount } = await req.json() as { amount: number };

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { stripeAccountId: true, stripeAccountStatus: true, firstName: true, lastName: true, email: true },
  });

  if (!driver?.stripeAccountId) {
    return NextResponse.json(
      { error: "No Stripe Connect account found. Please connect your bank account first." },
      { status: 400 }
    );
  }

  if (driver.stripeAccountStatus !== "active") {
    return NextResponse.json(
      { error: "Your Stripe account is not yet active. Please complete bank onboarding." },
      { status: 400 }
    );
  }

  /* Verify available balance */
  const walletTxs = await prisma.walletTransaction.findMany({
    where: { driverId: session.driverId },
  });

  const SETTLEMENT_HOURS = 48;
  const settlementCutoff = new Date(Date.now() - SETTLEMENT_HOURS * 60 * 60 * 1000);

  const settledEarnings = walletTxs
    .filter((t) => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt <= settlementCutoff)
    .reduce((s, t) => s + t.amount, 0);

  const totalTopups  = walletTxs.filter((t) => t.type === "TOPUP"  && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const totalPayouts = walletTxs.filter((t) => t.type === "PAYOUT" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const available    = parseFloat((settledEarnings + totalTopups - totalPayouts).toFixed(2));

  if (amount > available) {
    return NextResponse.json(
      { error: `Insufficient available balance ($${available.toFixed(2)})` },
      { status: 400 }
    );
  }

  /* Create Stripe transfer to connected account */
  const transfer = await stripe.transfers.create({
    amount:      Math.round(amount * 100),
    currency:    "cad",
    destination: driver.stripeAccountId,
  });

  /* Record as completed PAYOUT */
  const tx = await prisma.walletTransaction.create({
    data: {
      driverId: session.driverId,
      type:     "PAYOUT",
      status:   "COMPLETED",
      amount,
      note:     `Bank transfer via Stripe Connect — ref ${transfer.id}`,
    },
  });

  /* ── Notifications ── */
  const payoutData = {
    driverName:     `${driver.firstName} ${driver.lastName}`,
    driverEmail:    driver.email ?? "",
    amount,
    type:           "Stripe Connect (automated)",
    transactionId:  tx.id,
    requestedAt:    new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" }),
    automated:      true,
  };

  /* Driver notification */
  if (driver.email) {
    sendNotification({
      eventType: "CHAUFFEUR_PAYOUT_NOTIFICATION",
      recipient: { type: "driver", id: session.driverId, email: driver.email, firstName: driver.firstName },
      data: { payoutId: tx.id, amount, paymentMethod: "Stripe Connect", processedAt: payoutData.requestedAt, periodStart: "", periodEnd: "", ridesCompleted: 0 },
    }).catch(() => {});
  }

  /* Admin notification */
  notifyAdmins("ADMIN_PAYOUT_REQUEST", payoutData, ["EMAIL", "IN_APP"]).catch(() => {});

  return NextResponse.json({ success: true, transferId: transfer.id, transactionId: tx.id });
}
