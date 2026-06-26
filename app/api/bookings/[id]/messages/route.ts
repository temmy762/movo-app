import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pushToDriver, pushToUser } from "@/lib/webpush";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.driverId && !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const messages = await prisma.bookingMessage.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, sender: true, senderId: true, text: true, createdAt: true },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.driverId && !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const sender   = session.driverId ? "driver" : "rider";
  const senderId = (session.driverId ?? session.userId) as string;

  const message = await prisma.bookingMessage.create({
    data: { bookingId: id, sender, senderId, text: text.trim() },
  });

  /* Push to the other party */
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { driverId: true, userId: true, pickup: true },
  }).catch(() => null);

  if (booking) {
    const snippet = text.trim().slice(0, 60);
    if (sender === "rider" && booking.driverId) {
      pushToDriver(booking.driverId, {
        title: "New message from rider",
        body:  snippet,
        tag:   `msg-${id}`,
        data:  { type: "new_message_driver", bookingId: id, requireInteraction: "true" },
      }).catch(() => {});
    } else if (sender === "driver" && booking.userId) {
      pushToUser(booking.userId, {
        title: "Message from your chauffeur",
        body:  snippet,
        tag:   `msg-${id}`,
        data:  { type: "new_message_rider", bookingId: id, requireInteraction: "true" },
      }).catch(() => {});
    }
  }

  return NextResponse.json(message);
}
