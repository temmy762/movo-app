import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

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

  /* Available balance = settled (>=48h old) EARNING wallet-tx + topups - completed payouts.
     Must match GET /api/driver/wallet exactly — do NOT also sum raw booking.fare here, that
     double-counts every trip (once as gross fare, once as the EARNING tx already created for
     it at booking completion) and previously let drivers withdraw ~2x what they'd earned via
     a real Stripe transfer. */
  const SETTLEMENT_HOURS = 48;
  const settlementCutoff = new Date(Date.now() - SETTLEMENT_HOURS * 60 * 60 * 1000);

  const walletTxs = await prisma.walletTransaction.findMany({
    where: { driverId: session.driverId },
    select: { type: true, status: true, amount: true, createdAt: true },
  });

  const settledEarnings = walletTxs
    .filter(t => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt <= settlementCutoff)
    .reduce((s, t) => s + t.amount, 0);
  const topups  = walletTxs.filter(t => t.type === "TOPUP"  && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const payouts = walletTxs.filter(t => t.type === "PAYOUT" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);

  const availableBalance = parseFloat((settledEarnings + topups - payouts).toFixed(2));

  if (requested > availableBalance) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` },
      { status: 400 }
    );
  }

  /* Use Stripe Connect automatic payout if the driver is connected */
  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { stripeAccountId: true, stripeAccountStatus: true, firstName: true, lastName: true, email: true },
  });

  if (driver?.stripeAccountId && driver.stripeAccountStatus === "active") {
    /* Delegate to the Stripe Connect payout route logic inline */
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
    const transfer = await stripe.transfers.create({
      amount:      Math.round(requested * 100),
      currency:    "cad",
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
    const processedAt = new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" });
    const payoutData = {
      driverName:    `${driver.firstName} ${driver.lastName}`,
      driverEmail:   driver.email ?? "",
      amount:        requested,
      type:          "Stripe Connect (automated)",
      transactionId: tx.id,
      requestedAt:   processedAt,
      automated:     true,
    };
    if (driver.email) {
      sendNotification({
        eventType: "CHAUFFEUR_PAYOUT_NOTIFICATION",
        recipient: { type: "driver", id: session.driverId, email: driver.email, firstName: driver.firstName },
        data: { payoutId: tx.id, amount: requested, paymentMethod: "Stripe Connect", processedAt, periodStart: "", periodEnd: "", ridesCompleted: 0 },
      }).catch(() => {});
    }
    notifyAdmins("ADMIN_PAYOUT_REQUEST", payoutData, ["EMAIL", "IN_APP"]).catch(() => {});
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

  const requestedAt = new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" });
  const payoutData = {
    driverName:    `${driver?.firstName ?? ""} ${driver?.lastName ?? ""}`.trim(),
    driverEmail:   driver?.email ?? "",
    amount:        requested,
    type:          "Manual (pending approval)",
    transactionId: tx.id,
    requestedAt,
    automated:     false,
  };
  if (driver?.email) {
    sendNotification({
      eventType: "CHAUFFEUR_PAYOUT_NOTIFICATION",
      recipient: { type: "driver", id: session.driverId, email: driver.email, firstName: driver.firstName },
      data: { payoutId: tx.id, amount: requested, paymentMethod: "Manual bank transfer", processedAt: requestedAt, periodStart: "", periodEnd: "", ridesCompleted: 0 },
    }).catch(() => {});
  }
  notifyAdmins("ADMIN_PAYOUT_REQUEST", payoutData, ["EMAIL", "IN_APP"]).catch(() => {});

  return NextResponse.json(tx);
}
