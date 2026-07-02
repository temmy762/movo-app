/**
 * PATCH /api/bookings/[id]/decline
 *
 * A rider can book a specific driver directly (driverId set at creation).
 * Previously, if that driver declined, decline was purely client-side — the
 * booking stayed assigned to them server-side forever, invisible to every
 * other driver's pool query (which only matches driverId: null or their own
 * id), leaving the rider stuck on "Searching..." with no way out.
 *
 * This releases the booking back to the open pool (driverId → null) so any
 * other online, tier-matched driver can pick it up, and gives it a fresh
 * dispatch-timeout window so it still resolves (cancel + refund) if nobody
 * ever does.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { scheduleStandardDispatchTimeout } from "@/lib/dispatch/standardTimeout";
import { dispatchDriverReleased } from "@/lib/socket/dispatcher";
import { pushToUser } from "@/lib/webpush";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Only release if this driver is the one currently assigned and hasn't
       actually accepted (paid direct bookings auto-CONFIRM at creation, so
       match both statuses — acceptedAt/startedAt guard a real acceptance). */
    const result = await prisma.booking.updateMany({
      where: {
        id,
        driverId:    session.driverId,
        status:      { in: ["PENDING", "CONFIRMED"] },
        acceptedAt:  null,
        startedAt:   null,
        bookingType: { not: "CARE" },
      },
      data: { driverId: null },
    });

    if (result.count === 0) {
      /* Nothing to release — either not assigned to this driver, already
         accepted, or already terminal. Not an error from the driver's POV. */
      return NextResponse.json({ ok: true, released: false });
    }

    /* From the rider's perspective a decline and a silent no-response are the
       same event — tell them we're finding someone else. */
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { userId: true },
    });
    dispatchDriverReleased({ bookingId: id, userId: booking?.userId });
    if (booking?.userId) {
      pushToUser(booking.userId, {
        title: "Finding you another driver",
        body:  "Your selected driver isn't available. We're contacting other drivers nearby — you'll be refunded in full if none accepts.",
        tag:   `driver-released-${id}`,
        data:  { type: "driver_released", bookingId: id },
      }).catch(() => {});
    }

    scheduleStandardDispatchTimeout(id, "pool");
    return NextResponse.json({ ok: true, released: true });
  } catch (e) {
    console.error("[booking decline]", e);
    return NextResponse.json({ error: "Failed to decline booking" }, { status: 500 });
  }
}
