import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCommissionRate } from "@/lib/earnings";
import { getSession } from "@/lib/session";
import { SAFE_RIDE_DEFAULTS, type SafeRideSettings } from "@/lib/safeRide";

const TIER_SEEDS = [
  { tier: "classic", name: "Standard",   image: "/images/tiers/standard.png", baseFare: 4.00,  ratePerKm: 1.25, ratePerMin: 0.25, minFare: 18.00,  hourlyRate: 55.00,  hourlyMinHours: 2 },
  { tier: "premium", name: "Executive",   image: "/images/tiers/executive.png", baseFare: 6.00,  ratePerKm: 1.75, ratePerMin: 0.35, minFare: 25.00,  hourlyRate: 75.00,  hourlyMinHours: 2 },
  { tier: "black",   name: "Concierge",      image: "/images/tiers/concierge.png",  baseFare: 8.00,  ratePerKm: 2.25, ratePerMin: 0.45, minFare: 35.00,  hourlyRate: 95.00,  hourlyMinHours: 2 },
  /* Safe Ride — dual-chauffeur service priced independently of vehicle tiers */
  { tier: "care",    name: "Safe Ride", image: "/images/tiers/safe-ride.png",  baseFare: 15.00, ratePerKm: 2.75, ratePerMin: 0.55, minFare: 129.00, hourlyRate: 120.00, hourlyMinHours: 2 },
];

/* Fractions are stored as 0–1; admins naturally type percentages (15), so
   accept both and keep values in a sane range. */
const toRate = (v: unknown, max = 1) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n > 1 ? n / 100 : n, max);
};
const toMoney = (v: unknown) => Math.max(0, Number(v) || 0);
const toHour  = (v: unknown) => Math.min(23, Math.max(0, Math.round(Number(v) || 0)));

function cleanSafeRide(input: Partial<SafeRideSettings>): SafeRideSettings {
  const d = SAFE_RIDE_DEFAULTS;
  const pick = <K extends keyof SafeRideSettings>(k: K) => (input[k] ?? d[k]);
  return {
    returnBaseFare:      toMoney(pick("returnBaseFare")),
    returnPerKm:         toMoney(pick("returnPerKm")),
    returnPerMin:        toMoney(pick("returnPerMin")),
    returnBookingFee:    toMoney(pick("returnBookingFee")),
    returnMinimum:       toMoney(pick("returnMinimum")),
    returnBufferRate:    toRate(pick("returnBufferRate"), 2),
    lateNightBufferRate: toRate(pick("lateNightBufferRate"), 2),
    lateNightStartHour:  toHour(pick("lateNightStartHour")),
    lateNightEndHour:    toHour(pick("lateNightEndHour")),
    demandMultiplier:    Math.min(5, Math.max(1, Number(pick("demandMultiplier")) || 1)),
    chauffeurPayoutRate: toRate(pick("chauffeurPayoutRate"), 1),
    supportPayout:       toMoney(pick("supportPayout")),
    freeWaitingMinutes:  Math.max(0, Math.round(Number(pick("freeWaitingMinutes")) || 0)),
    waitingRatePerMin:   toMoney(pick("waitingRatePerMin")),
    defaultReturnMode:   pick("defaultReturnMode") === "SUPPORT" ? "SUPPORT" : "UBER",
  };
}

export async function GET(req: NextRequest) {
  try {
    /* Read first — only seed if rows are missing (avoids 3 sequential writes on every load) */
    const [tiers, global] = await Promise.all([
      prisma.vehicleTierConfig.findMany({ orderBy: { tier: "asc" } }),
      prisma.pricingConfig.findFirst(),
    ]);

    /* Seed missing tier rows in parallel only when needed */
    let resolvedTiers = tiers;
    if (tiers.length < TIER_SEEDS.length) {
      const existingTierNames = new Set(tiers.map(t => t.tier));
      const missing = TIER_SEEDS.filter(s => !existingTierNames.has(s.tier));
      await Promise.all(
        missing.map(seed =>
          prisma.vehicleTierConfig.upsert({
            where: { tier: seed.tier },
            update: {},
            create: { ...seed, price: 0 },
          })
        )
      );
      resolvedTiers = await prisma.vehicleTierConfig.findMany({ orderBy: { tier: "asc" } });
    }

    /* Seed global pricing row only when missing */
    const globalConfig = global ?? await prisma.pricingConfig.create({
      data: { gstRate: 0.05, serviceFeeRate: 0.12, additionalStopFee: 5.00, airportPickupFee: 10.00, freeWaitingMinutes: 5, waitingRatePerMin: 0.75 },
    });

    /* Rider pages read minimum fares from here, so it stays public — but the
       Safe Ride payout / buffer settings are internal: admins only, uncached. */
    const session = await getSession(req);
    if (session?.role === "ADMIN") {
      const safeRide = await prisma.safeRideConfig.findFirst()
        ?? await prisma.safeRideConfig.create({ data: SAFE_RIDE_DEFAULTS });
      return NextResponse.json(
        { tiers: resolvedTiers, global: globalConfig, safeRide },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const sr = await prisma.safeRideConfig.findFirst({
      select: { freeWaitingMinutes: true, waitingRatePerMin: true },
    }).catch(() => null);
    return NextResponse.json(
      {
        tiers: resolvedTiers, global: globalConfig,
        /* Safe Ride waiting rules are shown to riders, so they're public */
        safeRideWaiting: {
          freeWaitingMinutes: sr?.freeWaitingMinutes ?? SAFE_RIDE_DEFAULTS.freeWaitingMinutes,
          waitingRatePerMin:  sr?.waitingRatePerMin  ?? SAFE_RIDE_DEFAULTS.waitingRatePerMin,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("[admin/pricing GET]", e);
    return NextResponse.json({ error: "Failed to load pricing" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    /* Was unauthenticated — anyone could rewrite every fare and commission */
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { tiers, global: g, safeRide } = body as {
      tiers: Array<{
        tier: string; baseFare: number; ratePerKm: number; ratePerMin: number;
        minFare: number; hourlyRate: number; hourlyMinHours: number; commissionRate: number;
      }>;
      global: {
        id?: string; gstRate: number; serviceFeeRate: number;
        additionalStopFee: number; airportPickupFee: number;
        freeWaitingMinutes: number; waitingRatePerMin: number;
      };
      safeRide?: Partial<SafeRideSettings> & { id?: string };
    };

    await Promise.all([
      /* Update each tier */
      ...tiers.map((t) =>
        prisma.vehicleTierConfig.update({
          where: { tier: t.tier },
          data: {
            baseFare: t.baseFare, ratePerKm: t.ratePerKm, ratePerMin: t.ratePerMin,
            minFare: t.minFare, hourlyRate: t.hourlyRate, hourlyMinHours: t.hourlyMinHours,
            /* Store as a FRACTION always. Admins naturally type "20" for 20%,
               which used to be saved verbatim and made every driver earning
               fare × (1 − 20) — a large negative amount. */
            commissionRate: normalizeCommissionRate(t.commissionRate),
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
      /* Safe Ride engine settings (single row) */
      ...(safeRide
        ? [safeRide.id
            ? prisma.safeRideConfig.update({ where: { id: safeRide.id }, data: cleanSafeRide(safeRide) })
            : prisma.safeRideConfig.create({ data: cleanSafeRide(safeRide) })]
        : []),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/pricing PUT]", e);
    return NextResponse.json({ error: "Failed to save pricing" }, { status: 500 });
  }
}
