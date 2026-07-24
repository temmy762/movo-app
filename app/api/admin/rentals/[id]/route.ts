/**
 * PATCH /api/admin/rentals/[id]
 * Admin actions on a rental agreement: { action: "approve" | "decline" | "return", ... }
 *
 * Chauffeurs onboard WITH a vehicle by design, so rentals are available to
 * every chauffeur, not just ones with no vehicle on file — approving a
 * rental for someone who already has a car PARKS it (snapshotted onto
 * rental.parkedVehicle) rather than deleting their data, and RETURNING the
 * rental restores it automatically.
 *
 *  - approve: REQUESTED → APPROVED. Whatever vehicle the chauffeur currently
 *    has (own car, or a previous rental's leftover row) is snapshotted and
 *    removed, then a fresh Vehicle row is created from the rental vehicle
 *    (make/model/year/plate/tier, tagged rentalVehicleId) — the SAME field
 *    every dispatch/earnings/admin query already reads, so the chauffeur
 *    becomes immediately dispatchable with zero changes anywhere else.
 *  - decline: REQUESTED → DECLINED, full Stripe refund, vehicle stays
 *    AVAILABLE (it was never marked otherwise for a pending request).
 *  - return: APPROVED → COMPLETED ("assign/unassign" from the spec — ending
 *    an active rental IS unassigning the vehicle). Optionally charges a
 *    refuel/cleaning fee off-session to the card on file (same mechanism as
 *    the mid-ride waiting-time charge), deletes the rental-sourced Vehicle
 *    row, restores the parked vehicle (if any), frees the rental vehicle
 *    back to AVAILABLE.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";
import { sendNotification } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const PLAN_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    const rental = await prisma.vehicleRental.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true, stripeCustomerId: true,
            vehicle: { select: { id: true, make: true, model: true, year: true, plate: true, tier: true, photoUrl: true, rentalVehicleId: true } },
          },
        },
      },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });

    /* ── Approve ── */
    if (action === "approve") {
      if (rental.status !== "REQUESTED") {
        return NextResponse.json({ error: `Cannot approve a rental in status ${rental.status}` }, { status: 409 });
      }
      if (!rental.driverId || !rental.driver) {
        return NextResponse.json({ error: "This rental has no chauffeur attached" }, { status: 409 });
      }

      /* Pickup/return window is chosen by the chauffeur at request time now
         (see app/api/rentals/request/route.ts) — approval just confirms it.
         Fall back to approval-time + plan length only for any rental created
         before that change (startDate/endDate not yet populated). */
      const approvedAt = new Date();
      const startDate = rental.startDate ?? approvedAt;
      const endDate = rental.endDate ?? new Date(startDate.getTime() + (PLAN_DAYS[rental.plan] ?? 1) * 24 * 60 * 60 * 1000);

      /* Snapshot whatever vehicle they currently have (own car, or a leftover
         rental row) so it can be restored on return — never deleted for good. */
      const existingVehicle = rental.driver.vehicle;
      const parkedVehicle = existingVehicle
        ? {
            make: existingVehicle.make, model: existingVehicle.model, year: existingVehicle.year,
            plate: existingVehicle.plate, tier: existingVehicle.tier, photoUrl: existingVehicle.photoUrl,
            /* If what they had was itself a prior rental's vehicle, don't
               re-park it as "their own car" — that rental has already been
               completed/returned by the time this could happen, so treat it
               like an ordinary owned vehicle snapshot. */
            wasRental: !!existingVehicle.rentalVehicleId,
          }
        : null;

      try {
        await prisma.$transaction([
          ...(existingVehicle ? [prisma.vehicle.delete({ where: { id: existingVehicle.id } })] : []),
          prisma.vehicleRental.update({
            where: { id },
            data: { status: "APPROVED", approvedAt, startDate, endDate, parkedVehicle: parkedVehicle ?? undefined },
          }),
          prisma.rentalVehicle.update({ where: { id: rental.vehicleId }, data: { status: "RENTED" } }),
          prisma.vehicle.create({
            data: {
              driverId: rental.driverId,
              make: rental.vehicle.make, model: rental.vehicle.model, year: rental.vehicle.year,
              plate: rental.vehicle.plate, tier: rental.vehicle.tier,
              photoUrl: rental.vehicle.photos[0] ?? null,
              rentalVehicleId: rental.vehicleId,
            },
          }),
        ]);
      } catch (e) {
        /* Vehicle.driverId is unique — a concurrent assignment (own vehicle
           added, or another rental approved for the same driver) lost the
           race. Surface it instead of leaving the rental half-approved. */
        console.error("[admin/rentals approve] transaction failed:", e);
        return NextResponse.json({ error: "Couldn't assign the vehicle — the chauffeur may already have one. Please refresh and try again." }, { status: 409 });
      }

      if (rental.driver.email) {
        sendNotification({
          eventType: "CHAUFFEUR_RENTAL_APPROVED",
          recipient: { type: "driver", id: rental.driverId, email: rental.driver.email, firstName: rental.driver.firstName, phone: rental.driver.phone ?? undefined },
          data: {
            vehicle: `${rental.vehicle.make} ${rental.vehicle.model} ${rental.vehicle.year}`,
            plan: rental.plan, amount: rental.amount,
            endDate: endDate.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }),
          },
        }).catch(() => {});
      }

      logAudit({
        action: "rental.approved", entityType: "VehicleRental", entityId: id,
        actorType: "ADMIN", actorId: session.userId ?? null,
      }).catch(() => {});

      return NextResponse.json({ ok: true });
    }

    /* ── Decline ── */
    if (action === "decline") {
      if (rental.status !== "REQUESTED") {
        return NextResponse.json({ error: `Cannot decline a rental in status ${rental.status}` }, { status: 409 });
      }
      const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

      let refunded = false;
      let refundId: string | undefined;
      if (rental.stripePaymentIntentId) {
        try {
          const refund = await stripe.refunds.create({ payment_intent: rental.stripePaymentIntentId });
          refunded = true;
          refundId = refund.id;
        } catch (e) {
          console.error("[admin/rentals decline] refund failed:", e);
        }
      }

      await prisma.vehicleRental.update({
        where: { id },
        data: {
          status: "DECLINED", declinedAt: new Date(), adminNote: reason,
          ...(refunded ? { paymentStatus: "REFUNDED", refundId } : {}),
        },
      });

      if (rental.driver?.email) {
        sendNotification({
          eventType: "CHAUFFEUR_RENTAL_DECLINED",
          recipient: { type: "driver", id: rental.driverId!, email: rental.driver.email, firstName: rental.driver.firstName, phone: rental.driver.phone ?? undefined },
          data: {
            vehicle: `${rental.vehicle.make} ${rental.vehicle.model} ${rental.vehicle.year}`,
            amount: rental.amount, reason,
          },
        }).catch(() => {});
      }

      logAudit({
        action: "rental.declined", entityType: "VehicleRental", entityId: id,
        actorType: "ADMIN", actorId: session.userId ?? null,
        detail: { reason, refunded },
      }).catch(() => {});

      return NextResponse.json({ ok: true, refunded });
    }

    /* ── Return (complete + unassign) ── */
    if (action === "return") {
      if (rental.status !== "APPROVED") {
        return NextResponse.json({ error: `Cannot return a rental in status ${rental.status}` }, { status: 409 });
      }

      const fuelCost = Math.max(0, parseFloat(body?.fuelCost) || 0);
      const refuelServiceFee = fuelCost > 0 ? 20 : 0;
      const returnCharge = fuelCost > 0 ? parseFloat((fuelCost + refuelServiceFee).toFixed(2)) : 0;
      const returnChargeNote = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

      let chargeSucceeded = true;
      if (returnCharge > 0) {
        chargeSucceeded = false;
        try {
          let paymentMethodId: string | null = null;
          if (rental.stripePaymentIntentId) {
            const original = await stripe.paymentIntents.retrieve(rental.stripePaymentIntentId).catch(() => null);
            if (original && typeof original.payment_method === "string") paymentMethodId = original.payment_method;
          }
          if (!paymentMethodId && rental.driver?.stripeCustomerId) {
            const methods = await stripe.paymentMethods.list({ customer: rental.driver.stripeCustomerId, type: "card", limit: 1 });
            paymentMethodId = methods.data[0]?.id ?? null;
          }
          if (!rental.driver?.stripeCustomerId || !paymentMethodId) throw new Error("No saved payment method");

          const intent = await stripe.paymentIntents.create({
            amount: Math.round(returnCharge * 100),
            currency: "cad",
            customer: rental.driver.stripeCustomerId,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
            description: `Vehicle rental return charge — fuel + refueling fee (rental ${id})`,
            metadata: { kind: "rental_return_charge", rentalId: id },
          });
          chargeSucceeded = intent.status === "succeeded";
        } catch (e) {
          console.error("[admin/rentals return] fuel charge failed:", e);
        }
      }

      /* Restore whatever vehicle was parked at approval time (own car, or a
         prior rental) — this chauffeur is done with the Movo rental. */
      const parked = rental.parkedVehicle as
        | { make: string; model: string; year: number; plate: string; tier: string; photoUrl: string | null }
        | null;

      await prisma.$transaction([
        prisma.vehicleRental.update({
          where: { id },
          data: {
            status: "COMPLETED", returnedAt: new Date(),
            ...(returnCharge > 0 ? { returnCharge, returnChargeNote } : {}),
          },
        }),
        prisma.rentalVehicle.update({ where: { id: rental.vehicleId }, data: { status: "AVAILABLE" } }),
        /* Precise delete: only the rental-sourced Vehicle row for THIS
           rental's vehicle and THIS driver. */
        prisma.vehicle.deleteMany({
          where: { driverId: rental.driverId ?? undefined, rentalVehicleId: rental.vehicleId },
        }),
        ...(parked && rental.driverId
          ? [prisma.vehicle.create({
              data: {
                driverId: rental.driverId,
                make: parked.make, model: parked.model, year: parked.year,
                plate: parked.plate, tier: parked.tier, photoUrl: parked.photoUrl,
                rentalVehicleId: null,
              },
            })]
          : []),
      ]);

      logAudit({
        action: "rental.returned", entityType: "VehicleRental", entityId: id,
        actorType: "ADMIN", actorId: session.userId ?? null,
        detail: { returnCharge, chargeSucceeded },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        returnCharge,
        chargeSucceeded: returnCharge > 0 ? chargeSucceeded : null,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[admin/rentals PATCH]", e);
    return NextResponse.json({ error: "Failed to update rental" }, { status: 500 });
  }
}
