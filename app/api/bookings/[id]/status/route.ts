import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { BookingStatus } from "@prisma/client";

const VALID_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: BookingStatus };
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

    /* ── All other status transitions (COMPLETED, CANCELLED, etc.) ── */
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
