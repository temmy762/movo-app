import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";

const VALID_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];

/** PATCH /api/complaints/[id] — admin updates status, internal notes, or resolution */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, internalNotes, resolution } = body as {
      status?: string; internalNotes?: string; resolution?: string;
    };

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined)        data.status = status;
    if (internalNotes !== undefined) data.internalNotes = internalNotes;
    if (resolution !== undefined)    data.resolution = resolution;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const complaint = await prisma.complaint.update({ where: { id }, data });

    logAudit({
      action: "complaint.updated",
      entityType: "Complaint",
      entityId: id,
      actorType: "ADMIN",
      actorId: session.userId ?? null,
      detail: { status, internalNotes: internalNotes ? "updated" : undefined, resolution: resolution ? "updated" : undefined },
    }).catch(() => {});

    return NextResponse.json(complaint);
  } catch (e) {
    console.error("[complaints/:id] PATCH error:", e);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }
}
