/**
 * POST /api/rentals/request  — chauffeur rents a Movo vehicle.
 *
 * Two-phase, mirroring the add-stop pattern:
 *   Phase 1 (no intentId): validate eligibility, create a PaymentIntent for
 *     the plan price, return clientSecret for the client-side PaymentElement.
 *   Phase 2 (intentId): verify the payment succeeded, re-validate the vehicle
 *     is still free (auto-refund if someone beat them to it), create the
 *     VehicleRental in REQUESTED state, notify admins.
 *
 * Payment is taken up-front per the confirmed spec; a declined request is
 * refunded in full by the admin decline action. The intent attaches a Stripe
 * CUSTOMER for the driver (Driver.stripeCustomerId) with off_session reuse so
 * return charges (refuel + $20 fee, cleaning) can be collected later.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/auditLog";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const PLAN_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

function planAmount(vehicle: { dailyRate: number; weeklyRate: number; monthlyRate: number }, plan: string): number | null {
  if (plan === "DAILY")   return vehicle.dailyRate;
  if (plan === "WEEKLY")  return vehicle.weeklyRate;
  if (plan === "MONTHLY") return vehicle.monthlyRate;
  return null;
}

/* Mode-safe Stripe customer for a DRIVER (mirrors lib/stripeCustomer.ts,
   which is user-table-specific). */
async function getOrCreateDriverCustomer(driver: {
  id: string; email: string; firstName: string; lastName: string; stripeCustomerId: string | null;
}): Promise<string> {
  if (driver.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(driver.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) return driver.stripeCustomerId;
    } catch (e) {
      if ((e as { code?: string })?.code !== "resource_missing") throw e;
    }
  }
  const customer = await stripe.customers.create({
    email: driver.email ?? undefined,
    name: `${driver.firstName} ${driver.lastName}`.trim(),
    metadata: { driverId: driver.id, kind: "driver" },
  });
  await prisma.driver.update({ where: { id: driver.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/* Eligibility shared by both phases. Returns an error response or null. */
async function validateEligibility(driverId: string, vehicleId: string) {
  const [driver, vehicle, openRental, myOpenRental] = await Promise.all([
    prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true, status: true, email: true, firstName: true, lastName: true,
        stripeCustomerId: true, vehicle: { select: { id: true } },
      },
    }),
    prisma.rentalVehicle.findUnique({ where: { id: vehicleId } }),
    prisma.vehicleRental.findFirst({
      where: { vehicleId, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true, driverId: true },
    }),
    prisma.vehicleRental.findFirst({
      where: { driverId, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true },
    }),
  ]);

  if (!driver || driver.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Only approved chauffeurs can rent a Movo vehicle." }, { status: 403 }) };
  }
  /* Chauffeurs onboard WITH a vehicle by design, so gating rentals on "no
     vehicle" would make the feature unreachable for almost everyone. Renting
     is available to every chauffeur; approval PARKS whatever vehicle they
     currently have (own car or a prior rental) and restores it on return —
     see the approve/return actions in app/api/admin/rentals/[id]/route.ts. */
  if (myOpenRental) {
    return { error: NextResponse.json({ error: "You already have a rental request or an active rental." }, { status: 409 }) };
  }
  if (!vehicle || vehicle.status !== "AVAILABLE") {
    return { error: NextResponse.json({ error: "This vehicle is no longer available." }, { status: 409 }) };
  }
  if (openRental) {
    return { error: NextResponse.json({ error: "This vehicle has already been requested by another chauffeur." }, { status: 409 }) };
  }
  return { driver, vehicle };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const vehicleId = body?.vehicleId as string | undefined;
    const plan      = body?.plan as string | undefined;
    const intentId  = body?.intentId as string | undefined;

    if (!vehicleId || !plan || !PLAN_DAYS[plan]) {
      return NextResponse.json({ error: "vehicleId and plan (DAILY/WEEKLY/MONTHLY) required" }, { status: 400 });
    }

    const check = await validateEligibility(session.driverId, vehicleId);
    if ("error" in check && check.error) {
      /* Phase 2 with a completed payment but a now-invalid rental → refund */
      if (intentId) {
        try {
          const intent = await stripe.paymentIntents.retrieve(intentId);
          if (intent.status === "succeeded" && intent.metadata?.driverId === session.driverId) {
            await stripe.refunds.create({ payment_intent: intentId });
          }
        } catch (e) { console.error("[rentals/request] safety refund failed:", e); }
      }
      return check.error;
    }
    const { driver, vehicle } = check;

    const amount = planAmount(vehicle!, plan)!;

    /* ── Phase 1: create the payment intent ── */
    if (!intentId) {
      const customerId = await getOrCreateDriverCustomer(driver!);
      const intent = await stripe.paymentIntents.create({
        amount:   Math.round(amount * 100),
        currency: "cad",
        customer: customerId,
        setup_future_usage: "off_session",
        automatic_payment_methods: { enabled: true },
        description: `Movo vehicle rental — ${vehicle!.make} ${vehicle!.model} (${plan.toLowerCase()})`,
        metadata: { kind: "vehicle_rental", rentalVehicleId: vehicleId, driverId: driver!.id, plan },
      });
      return NextResponse.json({ clientSecret: intent.client_secret, intentId: intent.id, amount });
    }

    /* ── Phase 2: verify payment, create the rental request ── */
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (
      intent.status !== "succeeded" ||
      intent.metadata?.kind !== "vehicle_rental" ||
      intent.metadata?.rentalVehicleId !== vehicleId ||
      intent.metadata?.driverId !== session.driverId
    ) {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    /* Guard against double-submission of the same intent */
    const existing = await prisma.vehicleRental.findFirst({
      where: { stripePaymentIntentId: intentId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, rentalId: existing.id });

    const rental = await prisma.vehicleRental.create({
      data: {
        vehicleId,
        renterType: "DRIVER",
        driverId: session.driverId,
        plan: plan as never,
        amount: intent.amount / 100,
        status: "REQUESTED",
        stripePaymentIntentId: intentId,
        paymentStatus: "PAID",
      },
    });

    notifyAdmins(
      "ADMIN_RENTAL_REQUEST",
      {
        rentalId: rental.id,
        driverName: `${driver!.firstName} ${driver!.lastName}`,
        vehicle: `${vehicle!.make} ${vehicle!.model} ${vehicle!.year}`,
        plan,
        amount,
      },
      ["IN_APP"],
    ).catch(() => {});

    logAudit({
      action: "rental.requested",
      entityType: "VehicleRental",
      entityId: rental.id,
      actorType: "DRIVER",
      actorId: session.driverId,
      detail: { vehicleId, plan, amount },
    }).catch(() => {});

    return NextResponse.json({ ok: true, rentalId: rental.id });
  } catch (e) {
    console.error("[rentals/request]", e);
    return NextResponse.json({ error: "Failed to process rental request" }, { status: 500 });
  }
}
