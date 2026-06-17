import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [pendingBookings, openTickets, pendingPayouts, openIncidents] = await Promise.all([
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
      prisma.walletTransaction.findMany({
        where: { type: "PAYOUT", status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, amount: true, createdAt: true,
          driver: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.incidentReport.findMany({
        where: { reviewStatus: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, type: true, createdAt: true,
          user:   { select: { firstName: true, lastName: true } },
          driver: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const items = [
      ...pendingBookings.map(b => ({
        id:   b.id,
        type: "booking" as const,
        title: `New booking — ${b.clientName}`,
        sub:   `${b.carName} · CAD $${b.total.toFixed(0)}`,
        time:  b.createdAt,
        href:  "/admin/bookings",
      })),
      ...openTickets.map(t => ({
        id:   t.id,
        type: "support" as const,
        title: `Support ticket — ${t.user ? `${t.user.firstName} ${t.user.lastName}` : "Unknown"}`,
        sub:   t.category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        time:  t.createdAt,
        href:  "/admin/messages",
      })),
      ...pendingPayouts.map(p => ({
        id:   p.id,
        type: "payout" as const,
        title: `Payout request — ${p.driver ? `${p.driver.firstName} ${p.driver.lastName}` : "Unknown driver"}`,
        sub:   `CAD $${p.amount.toFixed(2)} · awaiting approval`,
        time:  p.createdAt,
        href:  "/admin/financials/payouts",
      })),
      ...openIncidents.map(i => {
        const reporter = i.user
          ? `${i.user.firstName} ${i.user.lastName}`
          : i.driver
            ? `${i.driver.firstName} ${i.driver.lastName}`
            : "Unknown";
        return {
          id:   i.id,
          type: "incident" as const,
          title: `Incident report — ${reporter}`,
          sub:   i.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
          time:  i.createdAt,
          href:  "/admin/incidents",
        };
      }),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

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
      return NextResponse.json({ success: true });
    } else if (type === "support") {
      await prisma.supportTicket.update({
        where: { id: notificationId },
        data: { status: "IN_PROGRESS" },
      });
      return NextResponse.json({ success: true });
    } else if (type === "payout") {
      return NextResponse.json({ success: true });
    } else if (type === "incident") {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
  } catch (e) {
    console.error("Error marking notification as read:", e);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
