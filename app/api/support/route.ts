import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, issue, description, bookingId } = body;

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    /* Resolve userId from session cookie */
    const cookieStore = await cookies();
    const token = cookieStore.get("movo_session")?.value;
    let userId: string | null = null;
    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        select: { userId: true },
      });
      userId = session?.userId ?? null;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        category,
        issue:       issue       ?? null,
        description: description ?? null,
        bookingId:   bookingId   ?? null,
        userId:      userId      ?? null,
      },
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error("[support] POST error:", err);
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
  }
}
