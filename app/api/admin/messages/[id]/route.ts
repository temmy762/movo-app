import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: status as never },
    });
    return NextResponse.json({ id: ticket.id, status: ticket.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
