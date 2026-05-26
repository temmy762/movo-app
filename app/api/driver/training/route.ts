import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { trainingCompleted: true },
  });

  return NextResponse.json({ completed: driver?.trainingCompleted ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleIndex } = await req.json();
  if (typeof moduleIndex !== "number" || moduleIndex < 0 || moduleIndex > 8) {
    return NextResponse.json({ error: "Invalid module index" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { trainingCompleted: true },
  });

  const existing = driver?.trainingCompleted ?? [];
  const updated = existing.includes(moduleIndex)
    ? existing
    : [...existing, moduleIndex];

  await prisma.driver.update({
    where: { id: session.driverId },
    data: { trainingCompleted: updated },
  });

  return NextResponse.json({ completed: updated });
}
