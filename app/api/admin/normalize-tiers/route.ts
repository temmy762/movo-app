import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTier } from "@/lib/normalizeTier";

export async function POST(req: NextRequest) {
  try {
    const vehicles = await prisma.vehicle.findMany({ select: { id: true, tier: true } });

    const toUpdate = vehicles.filter(v => {
      const normalized = normalizeTier(v.tier);
      return normalized !== v.tier;
    });

    if (toUpdate.length === 0) {
      return NextResponse.json({ updated: 0, message: "All tiers already normalized" });
    }

    await Promise.all(
      toUpdate.map(v =>
        prisma.vehicle.update({
          where: { id: v.id },
          data:  { tier: normalizeTier(v.tier) },
        })
      )
    );

    return NextResponse.json({
      updated: toUpdate.length,
      details: toUpdate.map(v => ({ id: v.id, from: v.tier, to: normalizeTier(v.tier) })),
    });
  } catch (e) {
    console.error("[normalize-tiers]", e);
    return NextResponse.json({ error: "Failed to normalize tiers" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({ select: { id: true, tier: true } });
    const nonStandard = vehicles.filter(v => !["classic", "premium", "black"].includes(v.tier));
    return NextResponse.json({
      total: vehicles.length,
      nonStandard: nonStandard.length,
      vehicles: nonStandard.map(v => ({ id: v.id, tier: v.tier, wouldBe: normalizeTier(v.tier) })),
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to check tiers" }, { status: 500 });
  }
}
