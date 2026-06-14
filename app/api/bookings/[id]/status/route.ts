import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { BookingStatus } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const VALID_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, cancelledBy, refundAmount } = body as { status: BookingStatus; cancelledBy?: string; refundAmount?: number };
    const session = await getSession(req);

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    /* ── Atomic claim: only succeeds if booking is still PENDING + unclaimed ── */
    if (status === "CONFIRMED" && session?.driverId) {
      const result = await prisma.booking.updateMany({
        where: { id, status: "PENDING", driverId: null },
        data:  { status: "CONFIRMED", driverId: session.driverId },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Booking already accepted by another driver" },
          { status: 409 }
        );
      }

      const booking = await prisma.booking.findUnique({ where: { id } });
      return NextResponse.json(booking);
    }

    /* ── CANCELLED — issue Stripe refund if payment was collected ── */
    if (status === "CANCELLED") {
      const existing = await prisma.booking.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      /* Block double-cancel */
      if (existing.status === "CANCELLED") {
        return NextResponse.json({ ...existing, refunded: existing.paymentStatus === "REFUNDED" });
      }

      /* Block cancellation of an already-started trip */
      if (existing.startedAt) {
        return NextResponse.json(
          { error: "Cannot cancel a trip that has already started" },
          { status: 409 }
        );
      }

      const now = new Date();
      const caller = cancelledBy ?? (session?.driverId ? "driver" : session?.userId ? "user" : "admin");

      if (existing.stripePaymentIntentId && existing.paymentStatus === "PAID") {
        try {
          /* ── Cancellation policy ── */
          const msElapsed    = now.getTime() - new Date(existing.createdAt).getTime();
          const within5Min   = msElapsed < 5 * 60 * 1000;
          const noDriver     = !existing.driverId;
          const isAdminForce = caller === "admin";

          let policyRefundAmount: number | undefined;

          if (isAdminForce || refundAmount !== undefined) {
            /* Admin-specified amount overrides policy */
            policyRefundAmount = refundAmount;
          } else if (within5Min || noDriver) {
            /* Full refund — free cancellation window or unassigned */
            policyRefundAmount = undefined;
          } else {
            /* Partial: 50% refund */
            policyRefundAmount = parseFloat((existing.total * 0.50).toFixed(2));
          }

          const refundParams: Stripe.RefundCreateParams = { payment_intent: existing.stripePaymentIntentId };
          if (policyRefundAmount && policyRefundAmount > 0 && policyRefundAmount < existing.total) {
            refundParams.amount = Math.round(policyRefundAmount * 100); /* cents */
          }
          const refund = await stripe.refunds.create(refundParams);
          const isPartial = !!refundParams.amount;
          const booking = await prisma.booking.update({
            where: { id },
            data: {
              status: "CANCELLED",
              paymentStatus: "REFUNDED",
              cancelledAt: now,
              cancelledBy: caller,
              refundId: refund.id,
            },
          });
          return NextResponse.json({ ...booking, refunded: true, partialRefund: isPartial });
        } catch (refundErr) {
          console.error("[Stripe] Refund failed:", refundErr);
          const booking = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED", cancelledAt: now, cancelledBy: caller },
          });
          return NextResponse.json({
            ...booking,
            refunded: false,
            refundError: "Refund could not be processed automatically. Please refund manually via admin dashboard.",
          });
        }
      }

      /* No payment to refund — just cancel */
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: now, cancelledBy: caller },
      });
      return NextResponse.json({ ...booking, refunded: false });
    }

    /* ── COMPLETED — update booking and auto-credit driver earnings ── */
    if (status === "COMPLETED") {
      const existing = await prisma.booking.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const booking = await prisma.booking.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      /* Auto-credit driver earnings after platform commission + fleet split */
      if (existing.driverId && existing.fare > 0) {
        const [tierConfig, driver] = await Promise.all([
          prisma.vehicleTierConfig.findFirst({
            where: { tier: { equals: existing.carTier ?? "classic", mode: "insensitive" } },
            select: { commissionRate: true },
          }).catch(() => null),
          prisma.driver.findUnique({
            where: { id: existing.driverId },
            select: { fleetOwnerId: true, fleetDriverSplit: true },
          }).catch(() => null),
        ]);

        const commission = tierConfig?.commissionRate ?? 0.20;
        const netAfterPlatform = parseFloat((existing.fare * (1 - commission)).toFixed(2));

        const driverSplit     = driver?.fleetDriverSplit ?? 1.0;
        const driverEarning   = parseFloat((netAfterPlatform * driverSplit).toFixed(2));
        const fleetEarning    = parseFloat((netAfterPlatform * (1 - driverSplit)).toFixed(2));

        const txNote = `Trip earning — booking ${id} (${Math.round(commission * 100)}% platform fee)`;

        const txOps: Promise<unknown>[] = [
          prisma.walletTransaction.create({
            data: {
              driverId: existing.driverId,
              type: "EARNING",
              status: "COMPLETED",
              amount: driverEarning,
              note: txNote,
            },
          }),
        ];

        /* Credit fleet owner if this driver belongs to a fleet */
        if (driver?.fleetOwnerId && fleetEarning > 0) {
          txOps.push(
            prisma.walletTransaction.create({
              data: {
                driverId: driver.fleetOwnerId,
                type: "EARNING",
                status: "COMPLETED",
                amount: fleetEarning,
                note: `Fleet earning — booking ${id}`,
              },
            })
          );
        }

        await Promise.all(txOps);
      }

      return NextResponse.json(booking);
    }

    /* ── All other status transitions ── */
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
