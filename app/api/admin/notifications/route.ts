import { NextResponse } from "next/server";
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
