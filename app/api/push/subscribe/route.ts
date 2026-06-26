import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId && !session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh:   keys.p256dh,
      auth:     keys.auth,
      userId:   session.userId   ?? null,
      driverId: session.driverId ?? null,
    },
    create: {
      endpoint,
      p256dh:   keys.p256dh,
      auth:     keys.auth,
      userId:   session.userId   ?? null,
      driverId: session.driverId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
