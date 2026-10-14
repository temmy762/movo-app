import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendNotification, notifyAdmins } from "@/lib/notifications";
import { reservePayout } from "@/lib/wallet";

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

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { stripeAccountId: true, stripeAccountStatus: true, firstName: true, lastName: true, email: true },
  });
  const automated = !!driver?.stripeAccountId && driver.stripeAccountStatus === "active";

  /* Balance check + reservation under a per-chauffeur lock (lib/wallet.ts):
     simultaneous requests can no longer both pass and pay out twice */
  const reserved = await reservePayout(
    session.driverId, requested,
    automated ? "Bank transfer via Stripe Connect" : (typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : "Send to bank"),
  );
  if (!reserved.ok) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: $${reserved.available.toFixed(2)}` },
      { status: 400 }
    );
  }

  /* Stripe Connect: transfer now, then settle the reserved payout */
  if (automated && driver) {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
    let transferId: string;
    try {
      const transfer = await stripe.transfers.create(
        { amount: Math.round(requested * 100), currency: "cad", destination: driver.stripeAccountId! },
        /* A retried request can never send the same payout twice */
        { idempotencyKey: `payout-${reserved.payout.id}` },
      );
      transferId = transfer.id;
    } catch (e) {
      console.error("[payout] Stripe transfer failed:", e);
      await prisma.walletTransaction.update({
        where: { id: reserved.payout.id },
        data: { status: "FAILED", note: "Bank transfer failed — not paid out" },
      });
      return NextResponse.json({ error: "The bank transfer couldn't be sent. Your balance is unchanged — please try again later." }, { status: 502 });
    }
    const tx = await prisma.walletTransaction.update({
      where: { id: reserved.payout.id },
      data: { status: "COMPLETED", note: `Bank transfer via Stripe Connect — ref ${transferId}` },
    });
    const processedAt = new Date().toLocaleString("en-CA", { timeZone: "America/Winnipeg" });
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
    return NextResponse.json({ ...tx, automated: true, transferId });
  }

  /* Manual payout — admin approval required */
  const tx = reserved.payout;

  const requestedAt = new Date().toLocaleString("en-CA", { timeZone: "America/Winnipeg" });
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
