import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseFixedFareInput } from "@/lib/customerFixedFareInput";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const parsed = await parseFixedFareInput(await req.json().catch(() => ({})), true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const fare = await prisma.customerFixedFare.update({
      where: { id },
      data: parsed.data,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
    return NextResponse.json({ fare });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Fixed fare not found" }, { status: 404 });
    }
    console.error("[admin fixed-fares PATCH]", e);
    return NextResponse.json({ error: "Failed to update fixed fare" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.customerFixedFare.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin fixed-fares DELETE]", e);
    return NextResponse.json({ error: "Failed to delete fixed fare" }, { status: 500 });
  }
}
