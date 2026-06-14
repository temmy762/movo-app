import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onboarding = await prisma.driverOnboarding.findUnique({
    where: { driverId: session.driverId },
    select: {
      bankAccountName:   true,
      bankInstitution:   true,
      bankAccountNumber: true,
      bankRoutingNumber: true,
    },
  });

  if (!onboarding) {
    return NextResponse.json({ banking: null });
  }

  return NextResponse.json({
    banking: {
      bankAccountName:   onboarding.bankAccountName,
      bankInstitution:   onboarding.bankInstitution,
      bankAccountNumber: onboarding.bankAccountNumber
        ? `••••${onboarding.bankAccountNumber.slice(-4)}`
        : null,
      bankRoutingNumber: onboarding.bankRoutingNumber
        ? `••••${onboarding.bankRoutingNumber.slice(-4)}`
        : null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bankAccountName, bankInstitution, bankAccountNumber, bankRoutingNumber } = body as {
    bankAccountName?: string;
    bankInstitution?: string;
    bankAccountNumber?: string;
    bankRoutingNumber?: string;
  };

  const existing = await prisma.driverOnboarding.findUnique({
    where: { driverId: session.driverId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Onboarding record not found" }, { status: 404 });
  }

  await prisma.driverOnboarding.update({
    where: { driverId: session.driverId },
    data: {
      ...(bankAccountName   !== undefined && { bankAccountName }),
      ...(bankInstitution   !== undefined && { bankInstitution }),
      ...(bankAccountNumber !== undefined && { bankAccountNumber }),
      ...(bankRoutingNumber !== undefined && { bankRoutingNumber }),
    },
  });

  return NextResponse.json({ success: true });
}
