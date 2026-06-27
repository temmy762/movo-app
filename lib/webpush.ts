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

/** Send to all subscriptions belonging to a driver */
export async function pushToDriver(driverId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { driverId } });
  await Promise.allSettled(subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)));
}

/** Send to all subscriptions belonging to a user (rider) */
export async function pushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)));
}

/** Send to ALL online drivers with a matching tier (for new booking alerts) */
export async function pushToOnlineDriversByTier(tier: string | null, payload: PushPayload) {
  const drivers = await prisma.driver.findMany({
    where: {
      isOnline: true,
      status: DriverStatus.APPROVED,
      ...(tier ? { vehicle: { is: { tier } } } : {}),
    },
    select: { id: true },
  });
  const driverIds = drivers.map(d => d.id);
  if (!driverIds.length) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { driverId: { in: driverIds } },
  });
  await Promise.allSettled(subs.map(s => send(s.endpoint, s.p256dh, s.auth, payload)));
}
