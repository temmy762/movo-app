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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Only release if this driver is actually the one currently assigned and
       the booking hasn't already moved past PENDING (e.g. another process
       already confirmed/cancelled it) — avoid clobbering a real acceptance. */
    const result = await prisma.booking.updateMany({
      where: { id, driverId: session.driverId, status: "PENDING", bookingType: { not: "CARE" } },
      data:  { driverId: null },
    });

    if (result.count === 0) {
      /* Nothing to release — either not assigned to this driver, already
         accepted, or already terminal. Not an error from the driver's POV. */
      return NextResponse.json({ ok: true, released: false });
    }

    scheduleStandardDispatchTimeout(id);
    return NextResponse.json({ ok: true, released: true });
  } catch (e) {
    console.error("[booking decline]", e);
    return NextResponse.json({ error: "Failed to decline booking" }, { status: 500 });
  }
}
