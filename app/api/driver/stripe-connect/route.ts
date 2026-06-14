import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET — Return the driver's Stripe Connect account status.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { stripeAccountId: true, stripeAccountStatus: true },
  });

  if (!driver?.stripeAccountId) {
    return NextResponse.json({ connected: false, status: null });
  }

  /* Refresh status from Stripe */
  try {
    const account = await stripe.accounts.retrieve(driver.stripeAccountId);
    const status  = account.charges_enabled ? "active" : "pending";

    if (status !== driver.stripeAccountStatus) {
      await prisma.driver.update({
        where: { id: session.driverId },
        data: { stripeAccountStatus: status },
      });
    }

    return NextResponse.json({
      connected: true,
      status,
      detailsSubmitted: account.details_submitted,
      chargesEnabled:   account.charges_enabled,
      payoutsEnabled:   account.payouts_enabled,
    });
  } catch {
    return NextResponse.json({ connected: true, status: driver.stripeAccountStatus });
  }
}

/**
 * POST — Create a Stripe Connect account + onboarding link.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { id: true, email: true, firstName: true, lastName: true, stripeAccountId: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  /* Reuse existing account if already created */
  let accountId = driver.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: driver.email,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: `${driver.firstName} ${driver.lastName}` },
    });
    accountId = account.id;

    await prisma.driver.update({
      where: { id: driver.id },
      data: { stripeAccountId: accountId, stripeAccountStatus: "pending" },
    });
  }

  /* Generate an onboarding link */
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${BASE_URL}/driver/home/profile/banking?connect=refresh`,
    return_url:  `${BASE_URL}/driver/home/profile/banking?connect=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
