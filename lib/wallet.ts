/**
 * Chauffeur wallet balance — one definition for the wallet screen and the
 * payout request, so what's shown is exactly what can be withdrawn.
 *
 *   available = settled earnings (≥ 48 h old) + top-ups
 *             − completed payouts − payouts awaiting admin approval
 *
 * Pending payouts are reserved: before, they weren't deducted, so a chauffeur
 * could file several requests that together exceeded what they'd earned.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SETTLEMENT_HOURS = 48;

type Tx = { type: string; status: string; amount: number; createdAt: Date };

export function walletTotals(txs: Tx[], now = Date.now()) {
  const cutoff = now - SETTLEMENT_HOURS * 60 * 60 * 1000;
  const sum = (f: (t: Tx) => boolean) => txs.filter(f).reduce((s, t) => s + t.amount, 0);
  const settledEarnings = sum((t) => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt.getTime() <= cutoff);
  const pendingEarnings = sum((t) => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt.getTime() > cutoff);
  const topups          = sum((t) => t.type === "TOPUP"  && t.status === "COMPLETED");
  const payouts         = sum((t) => t.type === "PAYOUT" && t.status === "COMPLETED");
  const pendingPayouts  = sum((t) => t.type === "PAYOUT" && t.status === "PENDING");
  const round = (n: number) => parseFloat(n.toFixed(2));
  return {
    settledEarnings: round(settledEarnings),
    pendingEarnings: round(pendingEarnings),
    topups: round(topups),
    payouts: round(payouts),
    pendingPayouts: round(pendingPayouts),
    available: round(settledEarnings + topups - payouts - pendingPayouts),
  };
}

/**
 * Reserve a payout atomically: a per-chauffeur lock means two requests at
 * the same moment (double tap, two devices) can't both pass the balance check.
 * Creates the PAYOUT as PENDING; the caller completes or fails it.
 */
export async function reservePayout(driverId: string, amount: number, note: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`payout:${driverId}`}))) AS l`;
    const txs = await tx.walletTransaction.findMany({
      where: { driverId },
      select: { type: true, status: true, amount: true, createdAt: true },
    });
    const { available } = walletTotals(txs);
    if (amount > available) return { ok: false as const, available };
    const payout = await tx.walletTransaction.create({
      data: { driverId, type: "PAYOUT", status: "PENDING", amount, note },
    });
    return { ok: true as const, payout };
  });
}
