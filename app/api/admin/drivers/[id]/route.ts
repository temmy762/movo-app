import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, city, country, status } = body;

    const statusMap: Record<string, string> = {
      "On Duty":       "ACTIVE",
      "Sick Leave":    "SUSPENDED",
      "Half-Day Leave":"PENDING",
    };

    const updateData: Record<string, unknown> = {};
    if (name) {
      const parts = (name as string).trim().split(" ");
      updateData.firstName = parts[0] ?? "";
      updateData.lastName  = parts.slice(1).join(" ") || "";
    }
    if (email)   updateData.email   = email;
    if (phone)   updateData.phone   = phone;
    if (city)    updateData.city    = city;
    if (country) updateData.country = country;
    if (status)  updateData.status  = statusMap[status] ?? "PENDING";

    const driver = await prisma.driver.update({ where: { id }, data: updateData as never });
    return NextResponse.json({ id: driver.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 });
  }
}
