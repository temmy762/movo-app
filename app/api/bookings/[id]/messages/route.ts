import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  return NextResponse.json(message);
}
