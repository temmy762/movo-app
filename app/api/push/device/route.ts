/**
 * Mobile app push tokens.
 *   POST   { token, platform: "ios"|"android", app: "chauffeur"|"customer" }
 *   DELETE { token }  — on logout
 * The token is re-pointed to whoever is signed in now, so a shared phone
 * never keeps notifying the previous account.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId && !session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, platform, app } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || !EXPO_TOKEN.test(token)) {
      return NextResponse.json({ error: "Invalid push token" }, { status: 400 });
    }
    if (!["ios", "android"].includes(platform) || !["chauffeur", "customer"].includes(app)) {
      return NextResponse.json({ error: "Invalid platform or app" }, { status: 400 });
    }

    const owner = { userId: session.userId ?? null, driverId: session.driverId ?? null };
    await prisma.deviceToken.upsert({
      where: { token },
      update: { platform, app, ...owner },
      create: { token, platform, app, ...owner },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-device POST]", e);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token === "string" && token) {
      await prisma.deviceToken.deleteMany({ where: { token } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-device DELETE]", e);
    return NextResponse.json({ error: "Failed to remove device" }, { status: 500 });
  }
}
