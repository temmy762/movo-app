import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession, isMobileClient } from "@/lib/session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/* Live Stripe only accepts https return links — never fall back to localhost */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://movoprive.com";

/* Payouts are sent as transfers: an account is ready once it can receive them */
const isReady = (a: Stripe.Account) => a.capabilities?.transfers === "active" && !!a.payouts_enabled;

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
    const status  = isReady(account) ? "active" : "pending";

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
 * POST — Create a Stripe Connect (Express) account + onboarding link.
 * Canadian accounts (Movo and its chauffeurs are in Canada; payouts in CAD).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: session.driverId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, stripeAccountId: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    /* Reuse the existing account — unless it can't be used (e.g. created in
       test mode before the live switch, or in the wrong country) */
    let accountId = driver.stripeAccountId;
    if (accountId) {
      const existing = await stripe.accounts.retrieve(accountId).catch(() => null);
      if (!existing || existing.country !== "CA") accountId = null;
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "CA",
        email: driver.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        individual: {
          first_name: driver.firstName || undefined,
          last_name:  driver.lastName || undefined,
          email:      driver.email ?? undefined,
        },
        business_profile: {
          name: `${driver.firstName} ${driver.lastName}`.trim(),
          product_description: "Chauffeur services provided through Movo Privé",
          mcc: "4121", /* taxicabs / limousines */
        },
        metadata: { driverId: driver.id },
      });
      accountId = account.id;
      await prisma.driver.update({
        where: { id: driver.id },
        data: { stripeAccountId: accountId, stripeAccountStatus: "pending" },
      });
    }

    /* The chauffeur app opens Stripe in an in-app browser; Stripe only accepts
       https links, so it returns via /app-return, which hands over to the app */
    const back = isMobileClient(req)
      ? `${BASE_URL}/app-return?to=banking&connect=`
      : `${BASE_URL}/driver/home/profile/banking?connect=`;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${back}refresh`,
      return_url:  `${back}success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (e) {
    /* Show Stripe's real reason (e.g. Connect not yet enabled on the account)
       instead of a generic "Connection failed" */
    const message = e instanceof Error ? e.message : "Stripe error";
    console.error("[stripe-connect POST]", message);
    return NextResponse.json(
      { error: `Couldn't start bank connection: ${message}` },
      { status: 502 },
    );
  }
}
