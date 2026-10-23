import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/sms";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, city, country, status } = body;

    const statusMap: Record<string, string> = {
      "Active":        "ACTIVE",
      "Suspended":     "SUSPENDED",
      "Inactive":      "PENDING",
      /* old labels, in case an open admin tab still sends them */
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
    if (email)   updateData.email   = String(email).trim();
    if (phone)   updateData.phone   = toE164(phone.trim());
    /* The form sends the address as shown ("Winnipeg, Canada") — store the
       parts, or every save appended another ", Canada" to the city */
    if (city) {
      const [c, ...rest] = String(city).split(",").map((s) => s.trim()).filter(Boolean);
      if (c) updateData.city = c;
      if (rest.length && !country) updateData.country = rest.join(", ");
    }
    if (country) updateData.country = country;
    /* An unrecognised label used to silently make the chauffeur PENDING
       (unable to take rides) — refuse it instead */
    if (status) {
      if (!statusMap[status]) return NextResponse.json({ error: `Unknown status "${status}"` }, { status: 400 });
      updateData.status = statusMap[status];
    }

    const driver = await prisma.driver.update({ where: { id }, data: updateData as never });
    return NextResponse.json({ id: driver.id });
  } catch (e: any) {
    console.error("[admin drivers PATCH]", e);
    if (e?.code === "P2002") {
      const field = String(e?.meta?.target ?? "").includes("phone") ? "phone number" : "email";
      return NextResponse.json({ error: `Another account already uses this ${field}.` }, { status: 409 });
    }
    if (e?.code === "P2025") return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Soft delete: set deletedAt timestamp to preserve all historical data and audit trails
    await prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    if (e?.code === "P2025") {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 });
  }
}
