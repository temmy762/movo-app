import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin(req: NextRequest) {
  const session = await getSession(req);
  return session?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const txs = await prisma.walletTransaction.findMany({
      where: {
        type: "PAYOUT",
        ...(statusFilter ? { status: statusFilter as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            onboarding: {
              select: {
                bankAccountName: true,
                bankInstitution: true,
                bankAccountNumber: true,
                bankRoutingNumber: true,
              },
            },
          },
        },
      },
    });

    const result = txs.map((t) => ({
      id: t.id,
      driverId: t.driverId,
      driverName: `${t.driver.firstName} ${t.driver.lastName}`,
      driverEmail: t.driver.email,
      amount: t.amount,
      note: t.note,
      status: t.status,
      createdAt: t.createdAt,
      banking: t.driver.onboarding
        ? {
            accountName: t.driver.onboarding.bankAccountName,
            institution: t.driver.onboarding.bankInstitution,
            accountNumber: t.driver.onboarding.bankAccountNumber
              ? `••••${t.driver.onboarding.bankAccountNumber.slice(-4)}`
              : null,
            routingNumber: t.driver.onboarding.bankRoutingNumber,
          }
        : null,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = await req.json();
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "id and action (approve|reject) required" }, { status: 400 });
    }

    const existing = await prisma.walletTransaction.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction is not in PENDING state" }, { status: 409 });
    }

    const newStatus = action === "approve" ? "COMPLETED" : "FAILED";
    const tx = await prisma.walletTransaction.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json(tx);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}
