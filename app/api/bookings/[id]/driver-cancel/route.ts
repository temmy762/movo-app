/**
 * PATCH /api/bookings/[id]/driver-cancel
 *
 * A chauffeur who already ACCEPTED a standard ride (or reservation) but can no
 * longer make it — before the trip has actually started — backs out here.
 * Unlike /status CANCELLED, this does NOT cancel or refund the ride: the
 * booking is released back to the open pool (mirroring the existing
 * "unresponsive pre-assigned driver" self-heal in
 * lib/dispatch/standardTimeout.ts) so it can be picked up by the next
 * available online, tier-matched chauffeur automatically. The rider is told
 * we're finding them another chauffeur, not that their ride was cancelled.
 *
 * Scope: standard rides only, and only before the trip starts. Once
 * startedAt is set the rider is physically in the vehicle — that can't be
 * silently handed to a different car, so it stays out of scope here (use
 * Report Incident / admin intervention instead). Care Ride assignments have
 * their own dual-chauffeur cancel/reassign flow via CareAssignment.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { releaseRideToPool } from "@/lib/dispatch/releaseRide";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!(await releaseRideToPool(id, session.driverId, reason))) {
      return NextResponse.json(
        { error: "This ride can no longer be cancelled — it may have already started, completed, or been reassigned." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[driver-cancel]", e);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
