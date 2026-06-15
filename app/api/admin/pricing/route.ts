import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIER_SEEDS = [
  { tier: "classic", name: "Movo Classic", image: "/images/movo classic.png", baseFare: 4.00, ratePerKm: 1.25, ratePerMin: 0.25, minFare: 18.00, hourlyRate: 55.00, hourlyMinHours: 2 },
  { tier: "premium", name: "Movo Premium", image: "/images/movo premium.png", baseFare: 6.00, ratePerKm: 1.75, ratePerMin: 0.35, minFare: 25.00, hourlyRate: 75.00, hourlyMinHours: 2 },
  { tier: "black",   name: "Movo Black",   image: "/images/prive black.png",  baseFare: 8.00, ratePerKm: 2.25, ratePerMin: 0.45, minFare: 35.00, hourlyRate: 95.00, hourlyMinHours: 2 },
];

export async function GET() {
  try {
    /* Ensure tier rows exist */
    for (const seed of TIER_SEEDS) {
      await prisma.vehicleTierConfig.upsert({
        where: { tier: seed.tier },
        update: {},
        create: { ...seed, price: 0 },
      });
    }

    const [tiers, global] = await Promise.all([
      prisma.vehicleTierConfig.findMany({ orderBy: { tier: "asc" } }),
      prisma.pricingConfig.findFirst(),
    ]);

    /* Ensure global pricing row exists */
    const globalConfig = global ?? await prisma.pricingConfig.create({
      data: { gstRate: 0.05, serviceFeeRate: 0.12, additionalStopFee: 5.00, airportPickupFee: 10.00, freeWaitingMinutes: 5, waitingRatePerMin: 0.75 },
    });

    return NextResponse.json({ tiers, global: globalConfig });
  } catch (e) {
    console.error("[admin/pricing GET]", e);
    return NextResponse.json({ error: "Failed to load pricing" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tiers, global: g } = body as {
      tiers: Array<{
        tier: string; baseFare: number; ratePerKm: number; ratePerMin: number;
        minFare: number; hourlyRate: number; hourlyMinHours: number; commissionRate: number;
      }>;
      global: {
        id?: string; gstRate: number; serviceFeeRate: number;
        additionalStopFee: number; airportPickupFee: number;
        freeWaitingMinutes: number; waitingRatePerMin: number;
      };
    };

    await Promise.all([
      /* Update each tier */
      ...tiers.map((t) =>
        prisma.vehicleTierConfig.update({
          where: { tier: t.tier },
          data: {
            baseFare: t.baseFare, ratePerKm: t.ratePerKm, ratePerMin: t.ratePerMin,
            minFare: t.minFare, hourlyRate: t.hourlyRate, hourlyMinHours: t.hourlyMinHours,
            commissionRate: t.commissionRate,
          },
        })
      ),
      /* Update global pricing */
      g.id
        ? prisma.pricingConfig.update({
            where: { id: g.id },
            data: {
              gstRate: g.gstRate, serviceFeeRate: g.serviceFeeRate,
              additionalStopFee: g.additionalStopFee, airportPickupFee: g.airportPickupFee,
              freeWaitingMinutes: g.freeWaitingMinutes, waitingRatePerMin: g.waitingRatePerMin,
            },
          })
        : prisma.pricingConfig.create({ data: g }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/pricing PUT]", e);
    return NextResponse.json({ error: "Failed to save pricing" }, { status: 500 });
  }
}
