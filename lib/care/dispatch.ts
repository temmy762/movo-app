/**
 * lib/care/dispatch.ts
 *
 * Core dispatch logic for Movo Care Ride.
 * Called from API routes — never blocks the response (fire-and-forget pattern).
 *
 * Dispatch order:
 *   PRIMARY  → 3–5 nearest ACTIVE+ONLINE drivers within 5 → 10 → 20 km of PICKUP
 *              dispatched simultaneously; first-accept wins, rest cancelled.
 *   SUPPORT  → 5 nearest ACTIVE+ONLINE drivers within 5 → 10 → 20 km of DROPOFF
 *              dispatched simultaneously; first-accept wins, rest cancelled.
 *
 * Both functions retry up to MAX_RETRY_ROUNDS full radius expansions before
 * giving up and emitting CARE_DISPATCH_FAILED.
 */

import { prisma } from "@/lib/prisma";
import { pushToDriver } from "@/lib/webpush";
import { notifyAdmins } from "@/lib/notifications";
import {
  dispatchCarePrimaryDispatched,
  dispatchCareSupportDispatched,
  dispatchCareDispatchFailed,
} from "@/lib/socket/dispatcher";

const DISPATCH_TIMEOUT_MS = 30_000;   // 30 s per batch
const PRIMARY_BATCH_SIZE  = 5;
const SUPPORT_BATCH_SIZE  = 5;
const RADII_KM            = [5, 10, 20];
const MAX_RETRY_ROUNDS    = 3;        // maximum full radius-expansion cycles

/* ── Notify admins + affected driver when a dispatch role is exhausted ──── */

async function notifyDispatchExhausted(
  bookingId: string,
  role: "PRIMARY" | "SUPPORT",
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientName: true, pickup: true, dropoff: true },
  });

  notifyAdmins(
    "ADMIN_CARE_DISPATCH_FAILED",
    {
      bookingId,
      role,
      clientName: booking?.clientName,
      pickup: booking?.pickup,
      dropoff: booking?.dropoff,
    },
    ["EMAIL", "IN_APP", "SMS"],
  ).catch((e) => console.error("[care dispatch] notifyAdmins failed:", e));

  /* When SUPPORT can't be found, the PRIMARY driver has likely already
     accepted and is waiting — let them know explicitly instead of leaving
     them guessing why no support chauffeur has shown up. */
  if (role === "SUPPORT") {
    const primary = await prisma.careAssignment.findFirst({
      where: { bookingId, role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED"] } },
      select: { driverId: true },
    });
    if (primary?.driverId) {
      pushToDriver(primary.driverId, {
        title: "⚠️ Movo Care Ride",
        body: "No support chauffeur is currently available. Our team has been notified.",
        tag: `care-support-failed-${bookingId}`,
        data: { type: "care_support_failed", bookingId },
      }).catch(() => {});
    }
  }
}

/* ── Haversine distance ─────────────────────────────────────────────────── */

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Find nearest available drivers ────────────────────────────────────── */

async function findNearbyDrivers(
  lat: number | null,
  lng: number | null,
  radiusKm: number,
  excludeIds: string[] = [],
  limit = 1,
): Promise<Array<{ id: string; firstName: string; lastName: string; distKm: number }>> {
  const candidates = await prisma.driver.findMany({
    where: {
      status:   "ACTIVE",
      isOnline: true,
      vehicle:  { tier: "black" },
      id:       excludeIds.length ? { notIn: excludeIds } : undefined,
    },
    select: { id: true, firstName: true, lastName: true, lat: true, lng: true },
  });

  /* When geocoding failed (no pickup coords), dispatch to all online black-tier drivers */
  if (lat === null || lng === null) {
    return candidates
      .slice(0, limit)
      .map((d) => ({ id: d.id, firstName: d.firstName, lastName: d.lastName, distKm: 0 }));
  }

  return candidates
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({
      id:        d.id,
      firstName: d.firstName,
      lastName:  d.lastName,
      distKm:    haversineKm(lat, lng, d.lat!, d.lng!),
    }))
    .filter((d) => d.distKm <= radiusKm)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, limit);
}

/* ── Dispatch PRIMARY drivers (batch, first-accept wins) ────────────────── */

export async function dispatchPrimary(
  bookingId: string,
  pickupLat: number | null,
  pickupLng: number | null,
  userId: string | null,
  excludeDriverIds: string[] = [],
  retryRound = 0,
): Promise<{ ok: boolean; message?: string }> {
  /* Guard: abort if booking no longer exists or is already terminal */
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, message: "Booking not found" };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { ok: false, message: "Booking already terminal" };
  }

  /* Guard: abort if a PRIMARY assignment is already active */
  const existingActive = await prisma.careAssignment.findFirst({
    where: {
      bookingId,
      role:   "PRIMARY",
      status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
    },
  });
  if (existingActive) return { ok: true, message: "Primary already active" };

  /* Guard: max retry rounds reached — give up and notify */
  if (retryRound >= MAX_RETRY_ROUNDS) {
    console.warn(`[care dispatch] PRIMARY exhausted ${MAX_RETRY_ROUNDS} rounds for booking ${bookingId}`);
    dispatchCareDispatchFailed({ bookingId, role: "PRIMARY", userId });
    notifyDispatchExhausted(bookingId, "PRIMARY").catch(() => {});
    return { ok: false, message: "No available primary chauffeur after max retries" };
  }

  for (const radius of RADII_KM) {
    const drivers = await findNearbyDrivers(
      pickupLat, pickupLng, radius, excludeDriverIds, PRIMARY_BATCH_SIZE,
    );
    if (drivers.length === 0) continue;

    /* Create PENDING assignments for all candidates simultaneously */
    const assignments = await Promise.all(
      drivers.map((d) =>
        prisma.careAssignment.create({
          data: {
            bookingId,
            driverId:    d.id,
            role:        "PRIMARY",
            status:      "PENDING",
            dispatchedAt: new Date(),
          },
        }),
      ),
    );

    /* Push notifications to all candidates */
    await Promise.all(
      drivers.map((d, i) =>
        pushToDriver(d.id, {
          title: "🌟 Movo Care Ride — Primary Chauffeur",
          body:  `Pickup: ${booking.pickup} · ${d.distKm.toFixed(1)} km away`,
          tag:   `care-primary-${bookingId}`,
          data:  { type: "care_primary", bookingId, assignmentId: assignments[i].id, requireInteraction: "true" },
        }).catch(() => {}),
      ),
    );

    dispatchCarePrimaryDispatched({
      bookingId,
      assignmentId: assignments[0].id,
      driverId:     drivers[0].id,
      userId,
    });

    /* Timeout: cancel any still-PENDING, retry with expanded exclude list */
    const dispatchedIds = drivers.map((d) => d.id);
    setTimeout(async () => {
      /* Check if a PRIMARY was already accepted — if so, no retry needed */
      const accepted = await prisma.careAssignment.findFirst({
        where: { bookingId, role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"] } },
      });
      if (accepted) return;

      const stillPending = await prisma.careAssignment.findMany({
        where: { bookingId, role: "PRIMARY", status: "PENDING" },
      });
      if (stillPending.length > 0) {
        await prisma.careAssignment.updateMany({
          where: { id: { in: stillPending.map((a) => a.id) } },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        });
      }

      const nextExclude = [...excludeDriverIds, ...dispatchedIds];
      dispatchPrimary(bookingId, pickupLat, pickupLng, userId, nextExclude, retryRound + 1).catch(() => {});
    }, DISPATCH_TIMEOUT_MS);

    return { ok: true };
  }

  /* No driver found in any radius this round — retry next round */
  const nextExclude = [...excludeDriverIds];
  dispatchPrimary(bookingId, pickupLat, pickupLng, userId, nextExclude, retryRound + 1).catch(() => {});
  return { ok: false, message: "No driver found in range, retrying" };
}

/* ── Dispatch SUPPORT drivers (batch, first-accept wins) ─────────────────── */

export async function dispatchSupport(
  bookingId: string,
  dropoffLat: number | null,
  dropoffLng: number | null,
  userId: string | null,
  excludeDriverIds: string[] = [],
  retryRound = 0,
): Promise<{ ok: boolean; message?: string }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, message: "Booking not found" };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { ok: false, message: "Booking already terminal" };
  }

  /* Guard: abort if a SUPPORT assignment is already active */
  const existingActive = await prisma.careAssignment.findFirst({
    where: {
      bookingId,
      role:   "SUPPORT",
      status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] },
    },
  });
  if (existingActive) return { ok: true, message: "Support already active" };

  /* Guard: max retry rounds reached */
  if (retryRound >= MAX_RETRY_ROUNDS) {
    console.warn(`[care dispatch] SUPPORT exhausted ${MAX_RETRY_ROUNDS} rounds for booking ${bookingId}`);
    dispatchCareDispatchFailed({ bookingId, role: "SUPPORT", userId });
    notifyDispatchExhausted(bookingId, "SUPPORT").catch(() => {});
    return { ok: false, message: "No available support chauffeur after max retries" };
  }

  for (const radius of RADII_KM) {
    const drivers = await findNearbyDrivers(
      dropoffLat, dropoffLng, radius, excludeDriverIds, SUPPORT_BATCH_SIZE,
    );
    if (drivers.length === 0) continue;

    /* Create PENDING assignments for all candidates simultaneously */
    const assignments = await Promise.all(
      drivers.map((d) =>
        prisma.careAssignment.create({
          data: {
            bookingId,
            driverId:    d.id,
            role:        "SUPPORT",
            status:      "PENDING",
            dispatchedAt: new Date(),
          },
        }),
      ),
    );

    /* Push notifications to all candidates */
    await Promise.all(
      drivers.map((d, i) =>
        pushToDriver(d.id, {
          title: "🔄 Care Ride — Support Chauffeur",
          body:  `Rendezvous: ${booking.dropoff} · ${d.distKm.toFixed(1)} km away`,
          tag:   `care-support-${bookingId}`,
          data:  { type: "care_support", bookingId, assignmentId: assignments[i].id, requireInteraction: "true" },
        }).catch(() => {}),
      ),
    );

    dispatchCareSupportDispatched({
      bookingId,
      driverIds: drivers.map((d) => d.id),
      userId,
    });

    /* Timeout: cancel any still-PENDING after 30 s, re-dispatch with next batch */
    const dispatchedIds = drivers.map((d) => d.id);
    setTimeout(async () => {
      /* Check if a SUPPORT was already accepted */
      const accepted = await prisma.careAssignment.findFirst({
        where: { bookingId, role: "SUPPORT", status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"] } },
      });
      if (accepted) return;

      const stillPending = await prisma.careAssignment.findMany({
        where: { bookingId, role: "SUPPORT", status: "PENDING" },
      });
      if (stillPending.length > 0) {
        await prisma.careAssignment.updateMany({
          where: { id: { in: stillPending.map((a) => a.id) } },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        });
      }

      const nextExclude = [...excludeDriverIds, ...dispatchedIds];
      dispatchSupport(bookingId, dropoffLat, dropoffLng, userId, nextExclude, retryRound + 1).catch(() => {});
    }, DISPATCH_TIMEOUT_MS);

    return { ok: true };
  }

  /* No driver found in any radius this round — retry next round */
  const nextExclude = [...excludeDriverIds];
  dispatchSupport(bookingId, dropoffLat, dropoffLng, userId, nextExclude, retryRound + 1).catch(() => {});
  return { ok: false, message: "No support driver found in range, retrying" };
}
