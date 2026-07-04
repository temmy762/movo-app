import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

/**
 * POST /api/contact
 *
 * Public contact form (no auth required) — logged as a SupportTicket so it
 * shows up in the same admin queue as in-app support requests, and admins
 * are notified immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        category: "GENERAL_INQUIRY",
        issue: `Contact form — ${name} <${email}>${phone ? ` · ${phone}` : ""}`,
        description: message,
      },
    });

    notifyAdmins(
      "SUPPORT_TICKET_CREATED",
      { ticketId: ticket.id, message: `New contact form submission from ${name} (${email}): ${message}` },
      ["EMAIL", "IN_APP"],
    ).catch(() => {});

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (e) {
    console.error("[contact] POST error:", e);
    return NextResponse.json({ error: "Failed to submit message" }, { status: 500 });
  }
}
