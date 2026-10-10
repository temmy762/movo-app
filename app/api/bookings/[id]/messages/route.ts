import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pushToDriver, pushToUser } from "@/lib/webpush";
import { dispatchMessageNew } from "@/lib/socket/dispatcher";
import type { SessionPayload } from "@/lib/session";

/* The two people on a ride: the rider, and their chauffeur — booking.driverId
   for standard rides, the accepted PRIMARY care assignment for Safe Ride. */
async function rideParticipants(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      userId: true, driverId: true,
      careAssignments: {
        where: { role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { driverId: true },
      },
    },
  });
  if (!booking) return null;
  return { userId: booking.userId, driverId: booking.driverId ?? booking.careAssignments[0]?.driverId ?? null };
}

/* Only the rider or their chauffeur may read / send messages on a ride */
function isParticipant(session: SessionPayload, p: { userId: string | null; driverId: string | null }) {
  return (!!session.userId && session.userId === p.userId) || (!!session.driverId && session.driverId === p.driverId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.driverId && !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const participants = await rideParticipants(id);
  if (!participants) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!isParticipant(session, participants)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const participants = await rideParticipants(id);
  if (!participants) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!isParticipant(session, participants)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const sender   = session.driverId ? "driver" : "rider";
  const senderId = (session.driverId ?? session.userId) as string;

  const message = await prisma.bookingMessage.create({
    data: { bookingId: id, sender, senderId, text: text.trim().slice(0, 1000) },
  });

  /* Socket: real-time delivery to both parties */
  dispatchMessageNew({
    bookingId: id,
    id:        message.id,
    sender,
    text:      message.text,
    createdAt: message.createdAt.toISOString(),
    userId:    participants.userId,
    driverId:  participants.driverId,
  });

  /* Push to the other party */
  const snippet = message.text.slice(0, 60);
  if (sender === "rider" && participants.driverId) {
    pushToDriver(participants.driverId, {
      title: "New message from rider",
      body:  snippet,
      tag:   `msg-${id}`,
      data:  { type: "new_message_driver", bookingId: id, requireInteraction: "true" },
    }).catch(() => {});
  } else if (sender === "driver" && participants.userId) {
    pushToUser(participants.userId, {
      title: "Message from your chauffeur",
      body:  snippet,
      tag:   `msg-${id}`,
      data:  { type: "new_message_rider", bookingId: id, requireInteraction: "true" },
    }).catch(() => {});
  }

  return NextResponse.json(message);
}
