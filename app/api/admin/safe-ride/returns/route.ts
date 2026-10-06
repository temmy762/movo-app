/**
 * GET /api/admin/safe-ride/returns?days=30
 *
 * Return Logistics Allowance charged vs actual Uber return cost, per Safe Ride
 * and in total — how Movo tracks its real margin and tunes the buffer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const days  = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        bookingType: "CARE",
        careReturnAllowance: { not: null },
        createdAt: { gte: since },
        status: { in: ["COMPLETED", "CANCELLED", "CONFIRMED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true, clientName: true, pickup: true, dropoff: true, status: true,
        total: true, careServicePortion: true, careReturnAllowance: true, chauffeurPayout: true,
        returnMode: true, uberReturnRef: true, uberReturnCost: true, uberReturnBookedAt: true,
        pricingSnapshot: true,
      },
    });

    const rows = bookings.map((b) => {
      const snap = (b.pricingSnapshot ?? {}) as { lateNight?: boolean; demandMultiplier?: number };
      return {
        id: b.id, createdAt: b.createdAt, clientName: b.clientName,
        pickup: b.pickup, dropoff: b.dropoff, status: b.status,
        total: b.total,
        servicePortion: b.careServicePortion,
        allowance: b.careReturnAllowance ?? 0,
        chauffeurPayout: b.chauffeurPayout,
        returnMode: b.returnMode,
        uberRef: b.uberReturnRef,
        uberCost: b.uberReturnCost,
        /* Positive = the allowance covered the Uber with room to spare */
        variance: b.uberReturnCost != null ? (b.careReturnAllowance ?? 0) - b.uberReturnCost : null,
        lateNight: !!snap.lateNight,
        demandMultiplier: snap.demandMultiplier ?? 1,
      };
    });

    const withCost = rows.filter((r) => r.uberCost != null);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const summary = {
      rides: rows.length,
      ridesWithUberCost: withCost.length,
      allowanceTotal: sum(withCost.map((r) => r.allowance)),
      uberCostTotal: sum(withCost.map((r) => r.uberCost ?? 0)),
      varianceTotal: sum(withCost.map((r) => r.variance ?? 0)),
      overBudget: withCost.filter((r) => (r.variance ?? 0) < 0).length,
      awaitingUberCost: rows.filter((r) => r.returnMode === "UBER" && r.status === "COMPLETED" && r.uberCost == null).length,
    };

    return NextResponse.json({ days, summary, rows });
  } catch (e) {
    console.error("[admin safe-ride returns GET]", e);
    return NextResponse.json({ error: "Failed to load Safe Ride returns" }, { status: 500 });
  }
}
