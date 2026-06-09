import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [pendingBookings, openTickets] = await Promise.all([
      prisma.booking.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, clientName: true, carName: true, total: true, createdAt: true },
      }),
      prisma.supportTicket.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, category: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const items = [
      ...pendingBookings.map(b => ({
        id:      b.id,
        type:    "booking" as const,
        title:   `New booking — ${b.clientName}`,
        sub:     `${b.carName} · $${b.total.toFixed(0)}`,
        time:    b.createdAt,
        href:    "/admin/bookings",
      })),
      ...openTickets.map(t => ({
        id:      t.id,
        type:    "support" as const,
        title:   `Support ticket — ${t.user ? `${t.user.firstName} ${t.user.lastName}` : "Unknown"}`,
        sub:     t.category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        time:    t.createdAt,
        href:    "/admin/messages",
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, type } = body;

    if (!notificationId || !type) {
      return NextResponse.json(
        { error: "Missing notificationId or type" },
        { status: 400 }
      );
    }

    // Mark notification as read based on type
    if (type === "booking") {
      // For bookings, we just acknowledge it was viewed
      // In a real system, you might want to add a "viewedAt" field to Booking
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    } else if (type === "support") {
      // For support tickets, mark as read
      await prisma.supportTicket.update({
        where: { id: notificationId },
        data: { status: "IN_PROGRESS" },
      });
      return NextResponse.json({ success: true, message: "Support ticket marked as in progress" });
    }

    return NextResponse.json(
      { error: "Unknown notification type" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Error marking notification as read:", e);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
