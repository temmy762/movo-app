import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, buildClearCookieHeader } from "@/lib/session";
import { walletTotals } from "@/lib/wallet";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, city: true, status: true, onboardingType: true },
  });

  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver);
}

/**
 * DELETE — the chauffeur closes their own account (required by the App Store
 * and Google Play). Body: { confirm: "DELETE" }.
 * Same soft delete as the admin's (deletedAt): sign-in is blocked and trip,
 * earnings and payout records are kept. Refused while a ride is active or
 * money is still owed to the chauffeur, so no earnings are lost.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") {
      return NextResponse.json({ error: "Please confirm account deletion." }, { status: 400 });
    }
    const driverId = session.driverId;

    const [activeRides, activeCare, txs] = await Promise.all([
      prisma.booking.count({ where: { driverId, status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.careAssignment.count({
        where: { driverId, status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN"] } },
      }),
      prisma.walletTransaction.findMany({
        where: { driverId },
        select: { type: true, status: true, amount: true, createdAt: true },
      }),
    ]);
    if (activeRides || activeCare) {
      return NextResponse.json(
        { error: "You have an upcoming or active ride. Please complete it or contact Movo before closing your account." },
        { status: 409 },
      );
    }
    const w = walletTotals(txs);
    if (w.available > 0.009 || w.pendingEarnings > 0.009 || w.pendingPayouts > 0.009) {
      return NextResponse.json(
        { error: "You still have earnings or a payout in progress. Please withdraw your balance (or wait for the payout) before closing your account." },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.driver.update({ where: { id: driverId }, data: { deletedAt: new Date(), isOnline: false } as never }),
      prisma.session.deleteMany({ where: { driverId } }),
      prisma.deviceToken.deleteMany({ where: { driverId } }),
      prisma.pushSubscription.deleteMany({ where: { driverId } }),
    ]);

    return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": buildClearCookieHeader() } });
  } catch (e) {
    console.error("[driver-delete]", e);
    return NextResponse.json({ error: "Couldn't close your account. Please contact Movo support." }, { status: 500 });
  }
}
