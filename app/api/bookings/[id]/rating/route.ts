import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * POST /api/bookings/[id]/rating
 *
 * Riders rate the chauffeur  → Booking.rating / Booking.review
 * Chauffeurs rate the rider  → Booking.driverRating / Booking.driverFeedback
 * (previously both wrote to the same columns and clobbered each other).
 *
 * Ratings of 3 stars or lower REQUIRE written feedback from either side so
 * the admin team can review recurring issues.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rating, review, feedback } = await req.json();
  const text: string | null = (review ?? feedback ?? null)?.toString().trim() || null;

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  if (rating <= 3 && !text) {
    return NextResponse.json(
      { error: "Please tell us what went wrong — feedback is required for ratings of 3 stars or lower." },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  /* ── Chauffeur rating the rider ── */
  if (session.driverId) {
    const isCareChauffeur = booking.bookingType === "CARE"
      ? !!(await prisma.careAssignment.findFirst({
          where: { bookingId: id, driverId: session.driverId },
          select: { id: true },
        }))
      : false;
    if (booking.driverId !== session.driverId && !isCareChauffeur) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { driverRating: rating, driverFeedback: text },
    });
    return NextResponse.json(updated);
  }

  /* ── Rider rating the chauffeur ── */
  if (booking.userId && booking.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { rating, review: text },
  });
  return NextResponse.json(updated);
}
