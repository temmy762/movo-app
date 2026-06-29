/**
 * lib/care/dispatch.ts
 *
 * Core dispatch logic for Movo Care Ride.
 * Called from API routes — never blocks the response (fire-and-forget pattern).
 *
 * Dispatch order:
 *   PRIMARY  → nearest ACTIVE+ONLINE driver within 5 → 10 → 20 km of PICKUP
 *   SUPPORT  → 5 nearest ACTIVE+ONLINE drivers within 5 → 10 → 20 km of DROPOFF
 *              dispatched simultaneously; first-accept wins, rest cancelled.
 */

import { prisma } from "@/lib/prisma";
import { pushToDriver } from "@/lib/webpush";
import {
  dispatchCarePrimaryDispatched,
  dispatchCareSupportDispatched,
} from "@/lib/socket/dispatcher";

const DISPATCH_TIMEOUT_MS = 30_000;   // 30 s per driver for PRIMARY
const SUPPORT_BATCH_SIZE  = 5;
const RADII_KM            = [5, 10, 20];

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
  lat: number,
  lng: number,
  radiusKm: number,
  excludeIds: string[] = [],
  limit = 1,
): Promise<Array<{ id: string; firstName: string; lastName: string; distKm: number }>> {
  const candidates = await prisma.driver.findMany({
    where: {
      status:   "ACTIVE",
      isOnline: true,
      lat:      { not: null },
      lng:      { not: null },
      id:       excludeIds.length ? { notIn: excludeIds } : undefined,
    },
    select: { id: true, firstName: true, lastName: true, lat: true, lng: true },
  });

  return candidates
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

/* ── Dispatch PRIMARY driver ────────────────────────────────────────────── */

export async function dispatchPrimary(
  bookingId: string,
  pickupLat: number,
  pickupLng: number,
  userId: string | null,
): Promise<{ ok: boolean; assignmentId?: string; message?: string }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, message: "Booking not found" };

  let assignmentId: string | undefined;

  for (const radius of RADII_KM) {
    const [driver] = await findNearbyDrivers(pickupLat, pickupLng, radius);
    if (!driver) continue;

    const assignment = await prisma.careAssignment.create({
      data: {
        bookingId,
        driverId:    driver.id,
        role:        "PRIMARY",
        status:      "PENDING",
        dispatchedAt: new Date(),
      },
    });
    assignmentId = assignment.id;

    pushToDriver(driver.id, {
      title: "🌟 Movo Care Ride — Primary Chauffeur",
      body:  `Pickup: ${booking.pickup} · ${driver.distKm.toFixed(1)} km away`,
      tag:   `care-primary-${bookingId}`,
      data:  { type: "care_primary", bookingId, assignmentId: assignment.id, requireInteraction: "true" },
    }).catch(() => {});

    dispatchCarePrimaryDispatched({ bookingId, assignmentId: assignment.id, driverId: driver.id, userId });

    /* Auto-cancel if driver does not accept within the timeout */
    setTimeout(async () => {
      const current = await prisma.careAssignment.findUnique({ where: { id: assignment.id } });
      if (current?.status === "PENDING") {
        await prisma.careAssignment.update({
          where: { id: assignment.id },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        });
        /* Retry with next driver in same radius, then expand */
        dispatchPrimary(bookingId, pickupLat, pickupLng, userId).catch(() => {});
      }
    }, DISPATCH_TIMEOUT_MS);

    return { ok: true, assignmentId };
  }

  /* No driver found across all radii — notify admin */
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "PENDING" } });
  console.warn(`[care dispatch] No PRIMARY driver found for booking ${bookingId}`);
  return { ok: false, message: "No available chauffeur in range" };
}

/* ── Dispatch SUPPORT driver (after PRIMARY accepts) ──────────────────── */

export async function dispatchSupport(
  bookingId: string,
  dropoffLat: number,
  dropoffLng: number,
  userId: string | null,
  excludeDriverIds: string[] = [],
): Promise<{ ok: boolean; message?: string }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, message: "Booking not found" };

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
    setTimeout(async () => {
      const stillPending = await prisma.careAssignment.findMany({
        where: { bookingId, role: "SUPPORT", status: "PENDING" },
      });
      if (stillPending.length > 0) {
        await prisma.careAssignment.updateMany({
          where: { id: { in: stillPending.map((a) => a.id) } },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        });
        const alreadyUsed = [
          ...excludeDriverIds,
          ...drivers.map((d) => d.id),
        ];
        dispatchSupport(bookingId, dropoffLat, dropoffLng, userId, alreadyUsed).catch(() => {});
      }
    }, DISPATCH_TIMEOUT_MS);

    return { ok: true };
  }

  console.warn(`[care dispatch] No SUPPORT driver found for booking ${bookingId}`);
  return { ok: false, message: "No available support chauffeur in range" };
}
