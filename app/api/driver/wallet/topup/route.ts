import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, note } = await req.json();
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const tx = await prisma.walletTransaction.create({
    data: {
      driverId: session.driverId,
      type: "TOPUP",
      status: "PENDING",
      amount: Number(amount),
      note: note ?? "Add money",
    },
  });

  return NextResponse.json(tx);
}
