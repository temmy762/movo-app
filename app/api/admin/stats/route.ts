import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get("period") ?? "8m";
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "3m":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "12m":
        startDate.setMonth(now.getMonth() - 12);
        break;
      case "all":
        startDate = new Date(2000, 0, 1); // Very old date for "all time"
        break;
      case "8m":
      default:
        startDate.setMonth(now.getMonth() - 8);
    }
    
    const eightMonthsAgo = startDate;

    const [
      bookingCounts,
      revenueAgg,
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      totalClients,
      recentBookings,
      recentActivity,
      chartBookings,
      tierBreakdown,
    ] = await Promise.all([
      prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.booking.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: "ACTIVE" } }),
      prisma.driver.count({ where: { isOnline: true } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, clientName: true, carName: true, carTier: true, status: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: eightMonthsAgo } },
        select: { createdAt: true, total: true, status: true, paymentStatus: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vehicle.groupBy({ by: ["tier"], _count: { id: true } }),
    ]);

    const counts = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookingCounts.forEach(({ status, _count }) => {
      const n = _count.id;
      counts.total += n;
      if (status === "PENDING")   counts.pending   = n;
      if (status === "CONFIRMED") counts.confirmed = n;
      if (status === "COMPLETED") counts.completed = n;
      if (status === "CANCELLED") counts.cancelled = n;
    });

    const rentStatus = {
      hired:     counts.total > 0 ? Math.round((counts.confirmed + counts.completed) / counts.total * 100) : 0,
      pending:   counts.total > 0 ? Math.round(counts.pending   / counts.total * 100) : 0,
      cancelled: counts.total > 0 ? Math.round(counts.cancelled / counts.total * 100) : 0,
    };

    const earningsMap: Record<string, number> = {};
    const bookingsMap: Record<string, { done: number; cancelled: number; total: number }> = {};

    chartBookings.forEach(b => {
      const d = new Date(b.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!earningsMap[key]) earningsMap[key] = 0;
      if (b.paymentStatus === "PAID") earningsMap[key] += b.total;
      if (!bookingsMap[key]) bookingsMap[key] = { done: 0, cancelled: 0, total: 0 };
      bookingsMap[key].total++;
      if (b.status === "COMPLETED") bookingsMap[key].done++;
      if (b.status === "CANCELLED") bookingsMap[key].cancelled++;
    });

    // Determine number of months to display based on period
    let monthCount = 8;
    if (period === "3m") monthCount = 3;
    else if (period === "6m") monthCount = 6;
    else if (period === "12m") monthCount = 12;
    else if (period === "all") {
      // For "all", count unique months in data
      monthCount = Object.keys(earningsMap).length || 12;
    }

    const monthlyEarnings: { month: string; v: number }[] = [];
    const monthlyBookings: { m: string; total: number; done: number; cancelled: number }[] = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const month = d.toLocaleDateString("en-US", { month: "short" });
      monthlyEarnings.push({ month, v: Math.round(earningsMap[key] ?? 0) });
      monthlyBookings.push({ m: month, total: bookingsMap[key]?.total ?? 0, done: bookingsMap[key]?.done ?? 0, cancelled: bookingsMap[key]?.cancelled ?? 0 });
    }

    return NextResponse.json({
      counts: { ...counts, totalDrivers, activeDrivers, onlineDrivers, totalClients },
      revenue: { total: Math.round((revenueAgg._sum.total ?? 0) * 100) / 100 },
      rentStatus,
      monthlyEarnings,
      monthlyBookings,
      recentBookings,
      recentActivity,
      tierBreakdown: tierBreakdown.map(t => ({ tier: t.tier, count: t._count.id })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
