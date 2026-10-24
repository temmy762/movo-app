import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { DriverStatus } from "@prisma/client";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? "mailto:notifications@movoprive.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body:  string;
  icon?: string;
  tag?:  string;
  data?: Record<string, string>;
}

async function send(endpoint: string, p256dh: string, auth: string, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
      { TTL: 60 }
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {});
    }
  }
}

/* ── Mobile apps (Expo push service → FCM / APNs) ──────────────────────────
   Every web-push send below also reaches the owner's phones. Failures never
   affect the caller: if the DeviceToken table isn't migrated yet, or Expo is
   down, the booking flow carries on as before. */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendToApps(where: { driverId?: { in: string[] } | string; userId?: string }, payload: PushPayload) {
  try {
    const devices = await prisma.deviceToken.findMany({ where, select: { token: true } });
    if (!devices.length) return;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    for (let i = 0; i < devices.length; i += 100) {
      const batch = devices.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch.map((d) => ({
          to: d.token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: "default",
          priority: "high",
          channelId: "default",
        }))),
      });
      const json = await res.json().catch(() => null) as { data?: { status: string; details?: { error?: string } }[] } | null;
      /* Uninstalled app / revoked permission → forget the token */
      const dead = (json?.data ?? [])
        .map((t, idx) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? batch[idx].token : null))
        .filter((t): t is string => !!t);
      if (dead.length) await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
    }
  } catch (err) {
    console.error("[push-apps]", err instanceof Error ? err.message : err);
  }
}

/** Send to all subscriptions belonging to a driver */
export async function pushToDriver(driverId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { driverId } });
  await Promise.allSettled([...subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)), sendToApps({ driverId }, payload)]);
}

/** Send to all subscriptions belonging to a user (rider) */
export async function pushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled([...subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)), sendToApps({ userId }, payload)]);
}

/** Send to ALL online drivers with a matching tier (for new booking alerts) */
export async function pushToOnlineDriversByTier(tier: string | null, payload: PushPayload) {
  const drivers = await prisma.driver.findMany({
    where: {
      isOnline: true,
      status: DriverStatus.ACTIVE,
      ...(tier ? { vehicle: { is: { tier } } } : {}),
    },
    select: { id: true },
  });
  const driverIds = drivers.map(d => d.id);
  if (!driverIds.length) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { driverId: { in: driverIds } },
  });
  await Promise.allSettled([...subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)), sendToApps({ driverId: { in: driverIds } }, payload)]);
}

/** Send to ALL approved drivers with a matching tier — including OFFLINE ones.
    Used for scheduled rides so off-shift chauffeurs can open the app and claim
    the request in advance. */
export async function pushToAllDriversByTier(tier: string | null, payload: PushPayload) {
  const drivers = await prisma.driver.findMany({
    where: {
      status: DriverStatus.ACTIVE,
      ...(tier ? { vehicle: { is: { tier } } } : {}),
    },
    select: { id: true },
  });
  const driverIds = drivers.map(d => d.id);
  if (!driverIds.length) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { driverId: { in: driverIds } },
  });
  await Promise.allSettled([...subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)), sendToApps({ driverId: { in: driverIds } }, payload)]);
}
