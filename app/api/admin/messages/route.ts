import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        booking: { select: { id: true, carName: true } },
      },
    });

    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const grp = (d: Date) => d.toDateString() === now.toDateString() ? "today"
      : d.toDateString() === yesterday.toDateString() ? "yesterday" : "earlier";

    // ── Client support tickets ──────────────────────────────────────────────
    const clientConvs = tickets
      .filter(t => !t.issue?.startsWith("DRIVER_MSG:"))
      .map(t => {
        const name = t.user ? `${t.user.firstName} ${t.user.lastName}` : "Unknown User";
        const lastMsg = t.description ?? t.issue ?? t.category.replace(/_/g, " ");
        const created = new Date(t.createdAt);
        return {
          id: t.id, name, lastMsg,
          time: created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          unread: t.status === "OPEN", online: false, group: grp(created),
          type: "client" as const,
          phone: (t.user as unknown as { phone?: string } | null)?.phone ?? undefined,
          messages: [{ id: 1, from: "user" as const, text: lastMsg,
            time: created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }],
        };
      });

    // ── Admin-to-driver messages (grouped by driverId) ──────────────────────
    const driverTickets = tickets.filter(t => t.issue?.startsWith("DRIVER_MSG:"));
    const driverIds: string[] = [...new Set(driverTickets.map(t => t.issue!.replace("DRIVER_MSG:", "")))];
    const drivers = driverIds.length > 0
      ? await prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, firstName: true, lastName: true, phone: true } })
      : [];
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, { name: `${d.firstName} ${d.lastName}`, phone: d.phone ?? undefined }]));

    const driverConvs = driverIds.map(did => {
      const msgs = driverTickets
        .filter(t => t.issue === `DRIVER_MSG:${did}`)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .map((t, i) => ({
          id: i + 1, from: "admin" as const,
          text: t.description ?? "",
          time: new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        }));
      const last = msgs[msgs.length - 1];
      const lastCreated = new Date(driverTickets.find(t => t.issue === `DRIVER_MSG:${did}`)!.createdAt);
      return {
        id: `driver_${did}`,
        name: driverMap[did]?.name ?? "Driver",
        phone: driverMap[did]?.phone,
        lastMsg: last?.text ?? "",
        time: last?.time ?? "",
        unread: false, online: false, group: grp(lastCreated),
        type: "driver" as const,
        messages: msgs,
      };
    });

    return NextResponse.json([...driverConvs, ...clientConvs]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { driverId, message } = await req.json();
    if (!driverId || !message?.trim()) {
      return NextResponse.json({ error: "driverId and message are required" }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });
    if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

    await prisma.supportTicket.create({
      data: {
        category: "CHAT_SUPPORT",
        issue:    `DRIVER_MSG:${driverId}`,
        description: message.trim(),
        status:   "IN_PROGRESS",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
