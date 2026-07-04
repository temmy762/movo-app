import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmins } from "@/lib/notifications";

/**
 * POST /api/lost-found — customer reports a lost item, or a chauffeur reports a found item
 * GET  /api/lost-found — admin dashboard list, filterable by status
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId && !session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, itemDescription, contactInfo } = body as {
      bookingId?: string; itemDescription: string; contactInfo?: string;
    };

    if (!itemDescription || itemDescription.trim().length < 3) {
      return NextResponse.json({ error: "Please describe the item" }, { status: 400 });
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true, driverId: true } });
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const isParty = session.userId === booking.userId || session.driverId === booking.driverId;
      if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reportedBy = session.driverId ? "DRIVER" : "CUSTOMER";

    const item = await prisma.lostFoundItem.create({
      data: {
        itemDescription: itemDescription.trim(),
        reportedBy,
        contactInfo: contactInfo ?? null,
        bookingId: bookingId ?? null,
        userId: session.userId ?? null,
        driverId: session.driverId ?? null,
      },
    });

    notifyAdmins(
      "ADMIN_NEW_INCIDENT_REPORT",
      {
        title: `Lost & Found — ${reportedBy === "DRIVER" ? "item found" : "item reported lost"}`,
        message: itemDescription.trim().slice(0, 140),
        itemId: item.id,
      },
      ["IN_APP"],
    ).catch(() => {});

    return NextResponse.json({ success: true, itemId: item.id }, { status: 201 });
  } catch (e) {
    console.error("[lost-found] POST error:", e);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const items = await prisma.lostFoundItem.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user:   { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        driver: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        booking:{ select: { id: true, pickup: true, dropoff: true, createdAt: true } },
      },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error("[lost-found] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch lost & found items" }, { status: 500 });
  }
}
