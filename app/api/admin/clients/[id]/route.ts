import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/sms";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, street, city, country } = body;

    const updateData: Record<string, unknown> = {};
    if (name) {
      const parts = (name as string).trim().split(" ");
      updateData.firstName = parts[0] ?? "";
      updateData.lastName  = parts.slice(1).join(" ") || "";
    }
    if (email !== undefined)   updateData.email   = email   || null;
    if (phone !== undefined)   updateData.phone   = phone ? toE164(phone.trim()) : null;
    if (street !== undefined)  updateData.street  = street  || null;
    if (city !== undefined)    updateData.city    = city    || null;
    if (country !== undefined) updateData.country = country || null;

    const user = await prisma.user.update({ where: { id }, data: updateData as never });
    return NextResponse.json({ id: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
