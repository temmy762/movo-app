import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normalizeCommissionRate } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const now  = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));

    const [paidBookings, refundedBookings, walletTxs, tierConfigs] = await Promise.all([
      prisma.booking.findMany({
        where: { paymentStatus: "PAID" },
        select: { total: true, fare: true, serviceFee: true, carTier: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { paymentStatus: "REFUNDED" },
        select: { total: true, createdAt: true },
      }),
      prisma.walletTransaction.findMany({
        where: { type: "PAYOUT" },
        select: { amount: true, status: true, createdAt: true },
      }),
      prisma.vehicleTierConfig.findMany({
        select: { tier: true, commissionRate: true },
      }),
    ]);

    /* Build tier → commissionRate map (normalized: 20 → 0.20) */
    const commissionMap: Record<string, number> = {};
    tierConfigs.forEach((t) => { commissionMap[t.tier.toLowerCase()] = normalizeCommissionRate(t.commissionRate); });

    /* Platform commission = fare × commissionRate for each booking */
    const totalGrossRevenue = paidBookings.reduce((s, b) => s + b.total, 0);
    const totalCommission   = paidBookings.reduce((s, b) => {
      const rate = commissionMap[b.carTier?.toLowerCase() ?? ""] ?? 0.20;
      return s + b.fare * rate;
    }, 0);

    const payoutsCompleted  = walletTxs.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
    const payoutsPending    = walletTxs.filter((t) => t.status === "PENDING").reduce((s, t) => s + t.amount, 0);
    const totalRefunds      = refundedBookings.reduce((s, b) => s + b.total, 0);

    /* Monthly breakdown for selected year */
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString("en-US", { month: "short" }),
      grossRevenue:  0,
      commission:    0,
      payouts:       0,
      refunds:       0,
    }));

    paidBookings
      .filter((b) => new Date(b.createdAt).getFullYear() === year)
      .forEach((b) => {
        const m    = new Date(b.createdAt).getMonth();
        const rate = commissionMap[b.carTier?.toLowerCase() ?? ""] ?? 0.20;
        months[m].grossRevenue += b.total;
        months[m].commission   += b.fare * rate;
      });

    walletTxs
      .filter((t) => t.status === "COMPLETED" && new Date(t.createdAt).getFullYear() === year)
      .forEach((t) => { months[new Date(t.createdAt).getMonth()].payouts += t.amount; });

    refundedBookings
      .filter((b) => new Date(b.createdAt).getFullYear() === year)
      .forEach((b) => { months[new Date(b.createdAt).getMonth()].refunds += b.total; });

    /* Round to 2dp */
    const cashflow = months.map((m) => ({
      ...m,
      grossRevenue: parseFloat(m.grossRevenue.toFixed(2)),
      commission:   parseFloat(m.commission.toFixed(2)),
      payouts:      parseFloat(m.payouts.toFixed(2)),
      refunds:      parseFloat(m.refunds.toFixed(2)),
    }));

    /* Available years */
    const dataYears = new Set<number>([
      ...paidBookings.map((b) => new Date(b.createdAt).getFullYear()),
    ]);
    const cur = now.getFullYear();
    for (let y = cur - 2; y <= cur; y++) dataYears.add(y);
    const availableYears = [...dataYears].sort((a, b) => b - a);

    return NextResponse.json({
      summary: {
        grossRevenue:    parseFloat(totalGrossRevenue.toFixed(2)),
        commissionEarned: parseFloat(totalCommission.toFixed(2)),
        payoutsIssued:   parseFloat(payoutsCompleted.toFixed(2)),
        outstandingPayouts: parseFloat(payoutsPending.toFixed(2)),
        refundsIssued:   parseFloat(totalRefunds.toFixed(2)),
        netRevenue:      parseFloat((totalGrossRevenue - payoutsCompleted - totalRefunds).toFixed(2)),
      },
      cashflow,
      availableYears,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
