import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAT_COLORS: Record<string, string> = {
  "Staff Salaries":     "#1e2d45",
  "Vehicle Maintenance":"#ef4444",
  "Fuel":               "#f97316",
  "Insurance":          "#06b6d4",
  "Office Supplies":    "#8b5cf6",
  "Marketing":          "#6b7280",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now   = new Date();
    const year  = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14);

    const [paidBookings, allBookings, payouts] = await Promise.all([
      prisma.booking.findMany({
        where: { paymentStatus: "PAID" },
        select: { total: true, createdAt: true },
      }),
      prisma.booking.findMany({
        select: { total: true, createdAt: true },
      }),
      prisma.walletTransaction.findMany({
        where: { type: "PAYOUT" },
        select: { amount: true, status: true, note: true, createdAt: true, driver: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // ── Stats ────────────────────────────────────────────────────────────────
    const totalIncome   = paidBookings.reduce((s, b) => s + b.total, 0);
    const totalExpenses = payouts.filter(p => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
    const balance       = totalIncome - totalExpenses;

    const incThisWeek = paidBookings.filter(b => new Date(b.createdAt) >= thisWeekStart).reduce((s, b) => s + b.total, 0);
    const incLastWeek = paidBookings.filter(b => new Date(b.createdAt) >= lastWeekStart && new Date(b.createdAt) < thisWeekStart).reduce((s, b) => s + b.total, 0);
    const expThisWeek = payouts.filter(p => p.status === "COMPLETED" && new Date(p.createdAt) >= thisWeekStart).reduce((s, p) => s + p.amount, 0);
    const expLastWeek = payouts.filter(p => p.status === "COMPLETED" && new Date(p.createdAt) >= lastWeekStart && new Date(p.createdAt) < thisWeekStart).reduce((s, p) => s + p.amount, 0);

    const pctChange = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? "+100.0%" : "0.0%";
      const c = ((cur - prev) / prev * 100).toFixed(1);
      return (Number(c) >= 0 ? "+" : "") + c + "%";
    };

    // ── Monthly cashflow (current year) ──────────────────────────────────────
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString("en-US", { month: "short" }),
      income: 0, expenses: 0,
    }));
    allBookings.filter(b => new Date(b.createdAt).getFullYear() === year).forEach(b => {
      months[new Date(b.createdAt).getMonth()].income += b.total;
    });
    payouts.filter(p => new Date(p.createdAt).getFullYear() === year).forEach(p => {
      months[new Date(p.createdAt).getMonth()].expenses += p.amount;
    });

    // ── Expense transactions — filtered to selected year ─────────────────────
    const yearPayouts = payouts.filter(p => new Date(p.createdAt).getFullYear() === year);
    const transactions = yearPayouts.map((p, i) => ({
      id:       i + 1,
      expense:  p.note ?? `${p.driver.firstName} ${p.driver.lastName} Payout`,
      category: "Staff Salaries",
      qty:      1,
      amount:   Math.round(p.amount * 100) / 100,
      date:     new Date(p.createdAt).toISOString().split("T")[0],
      status:   (p.status === "COMPLETED" ? "Completed" : "Pending") as "Completed" | "Pending",
    }));

    // ── Category breakdown for selected year ─────────────────────────────────
    const catMap = new Map<string, number>();
    yearPayouts
      .filter(p => p.status === "COMPLETED")
      .forEach(p => {
        const cat = "Staff Salaries";
        catMap.set(cat, (catMap.get(cat) ?? 0) + p.amount);
      });
    const breakdown = Array.from(catMap.entries()).map(([name, amount]) => ({
      name, amount: Math.round(amount),
      color: CAT_COLORS[name] ?? "#6b7280",
    }));

    // ── Available years (from DB data + last 3 years always) ─────────────────
    const dataYears = new Set<number>([
      ...allBookings.map(b => new Date(b.createdAt).getFullYear()),
      ...payouts.map(p => new Date(p.createdAt).getFullYear()),
    ]);
    const cur = now.getFullYear();
    for (let y = cur - 2; y <= cur; y++) dataYears.add(y);
    const availableYears = [...dataYears].sort((a, b) => b - a);

    return NextResponse.json({
      stats: {
        balance:        Math.round(balance),
        income:         Math.round(totalIncome),
        expenses:       Math.round(totalExpenses),
        balanceChange:  pctChange(incThisWeek - expThisWeek, incLastWeek - expLastWeek),
        incomeChange:   pctChange(incThisWeek, incLastWeek),
        expensesChange: pctChange(expThisWeek, expLastWeek),
      },
      cashflow: months,
      transactions,
      breakdown,
      availableYears,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}
