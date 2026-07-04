import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";

const VALID_STATUSES = ["REPORTED", "MATCHED", "RETURNED", "CLOSED"];

/** PATCH /api/lost-found/[id] — admin updates status, collection notes, or marks returned */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, collectionNotes } = body as { status?: string; collectionNotes?: string };

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined)          data.status = status;
    if (collectionNotes !== undefined) data.collectionNotes = collectionNotes;
    if (status === "RETURNED")         data.returnedAt = new Date();

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const item = await prisma.lostFoundItem.update({ where: { id }, data });

    logAudit({
      action: "lostFoundItem.updated",
      entityType: "LostFoundItem",
      entityId: id,
      actorType: "ADMIN",
      actorId: session.userId ?? null,
      detail: { status },
    }).catch(() => {});

    return NextResponse.json(item);
  } catch (e) {
    console.error("[lost-found/:id] PATCH error:", e);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
