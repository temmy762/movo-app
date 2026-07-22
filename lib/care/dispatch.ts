/**
 * lib/care/dispatch.ts
 *
 * Core dispatch logic for Safe Ride.
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

/* Server batch window MUST exceed the driver's 30s on-screen countdown: the
   client countdown starts when the push/socket lands (seconds after dispatch),
   so a 30s server window cancelled assignments while drivers were still inside
   their visible countdown — their Accept then 422'd ("did not work"). 45s gives
   the whole client window plus network/skew grace. */
const DISPATCH_TIMEOUT_MS = 45_000;
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
        title: "⚠️ Safe Ride",
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

/* Safe Ride chauffeur tier priority: prefer Black, fall back to Premium, then
   Classic when no higher-tier chauffeur is available. Pricing is unaffected —
   Safe Ride fares always use the dedicated "care" pricing config regardless of
   which tier chauffeur accepts. */
const CARE_TIER_PRIORITY = ["black", "premium", "classic"] as const;

async function findNearbyDrivers(
  lat: number | null,
  lng: number | null,
  radiusKm: number,
  excludeIds: string[] = [],
  limit = 1,
): Promise<Array<{ id: string; firstName: string; lastName: string; distKm: number }>> {
  /* Fetch all ACTIVE + online drivers who have a vehicle; the tier priority is
     applied in JS below (case-insensitively). Filtering tier at the DB level
     with `{ in: [...], mode: "insensitive" }` is unsupported for `in` and was
     both fragile (case-sensitive in practice) and a silent-throw risk. */
  const candidates = await prisma.driver.findMany({
    where: {
      status:   "ACTIVE",
      isOnline: true,
      vehicle:  { isNot: null },
      id:       excludeIds.length ? { notIn: excludeIds } : undefined,
    },
    select: { id: true, firstName: true, lastName: true, lat: true, lng: true, vehicle: { select: { tier: true } } },
  });

  /* Tier priority is an ORDERING, not a filter. The old per-tier loop returned
     ONLY the highest tier that had anyone online — so while a single black-tier
     chauffeur was online, lower-tier chauffeurs never received the request, and
     every retry round re-offered the same unresponsive person forever. Now the
     batch fills across tiers: higher tiers claim the first slots, lower tiers
     fill the rest, so an ignored offer reaches the next chauffeur down. */
  const tierRank = (t: string | null | undefined): number => {
    const i = CARE_TIER_PRIORITY.indexOf((t ?? "").toLowerCase() as (typeof CARE_TIER_PRIORITY)[number]);
    return i === -1 ? CARE_TIER_PRIORITY.length : i;
  };

  const eligible = candidates.filter((d) =>
    (CARE_TIER_PRIORITY as readonly string[]).includes((d.vehicle?.tier ?? "").toLowerCase()),
  );

  /* When geocoding failed (no coords), dispatch to any online eligible drivers */
  if (lat === null || lng === null) {
    return eligible
      .sort((a, b) => tierRank(a.vehicle?.tier) - tierRank(b.vehicle?.tier))
      .slice(0, limit)
      .map((d) => ({ id: d.id, firstName: d.firstName, lastName: d.lastName, distKm: 0 }));
  }

  return eligible
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({
      id:        d.id,
      firstName: d.firstName,
      lastName:  d.lastName,
      rank:      tierRank(d.vehicle?.tier),
      distKm:    haversineKm(lat, lng, d.lat!, d.lng!),
    }))
    .filter((d) => d.distKm <= radiusKm)
    .sort((a, b) => a.rank - b.rank || a.distKm - b.distKm)
    .slice(0, limit)
    .map(({ id, firstName, lastName, distKm }) => ({ id, firstName, lastName, distKm }));
}

/* Pick a dispatch batch: nearest drivers within expanding radii; if nobody is
   in range (or eligible drivers have no GPS fix stored), fall back to ANY
   online eligible chauffeur regardless of distance. With a small city fleet,
   the hard 20 km cap silently produced zero candidates — the request was never
   delivered to anyone even though chauffeurs were online. */
async function selectDispatchBatch(
  lat: number | null,
  lng: number | null,
  excludeIds: string[],
  limit: number,
): Promise<Array<{ id: string; firstName: string; lastName: string; distKm: number }>> {
  for (const radius of RADII_KM) {
    const drivers = await findNearbyDrivers(lat, lng, radius, excludeIds, limit);
    if (drivers.length > 0) return drivers;
  }
  return findNearbyDrivers(null, null, 0, excludeIds, limit);
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

  const drivers = await selectDispatchBatch(
    pickupLat, pickupLng, excludeDriverIds, PRIMARY_BATCH_SIZE,
  );

  /* Literally nobody online/eligible right now — wait a window before the next
     round so a chauffeur coming online in the next couple of minutes still gets
     the request (immediate recursion used to burn all rounds in milliseconds). */
  if (drivers.length === 0) {
    setTimeout(() => {
      dispatchPrimary(bookingId, pickupLat, pickupLng, userId, excludeDriverIds, retryRound + 1).catch(() => {});
    }, DISPATCH_TIMEOUT_MS);
    return { ok: false, message: "No driver available this round, retrying" };
  }

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
        title: "🌟 Safe Ride — Primary Chauffeur",
        body:  `Pickup: ${booking.pickup}${d.distKm > 0 ? ` · ${d.distKm.toFixed(1)} km away` : ""}`,
        tag:   `care-primary-${bookingId}`,
        data:  { type: "care_primary", bookingId, assignmentId: assignments[i].id, requireInteraction: "true" },
      }).catch(() => {}),
    ),
  );

  /* Emit to EVERY batched driver with their OWN assignment id — previously
     only drivers[0] got the socket event, so the rest of the batch saw the
     request only if their web-push landed or they reloaded. */
  drivers.forEach((d, i) => {
    dispatchCarePrimaryDispatched({
      bookingId,
      assignmentId: assignments[i].id,
      driverId:     d.id,
      userId,
    });
  });

  /* Timeout: cancel any still-PENDING, then RE-OFFER TO THE SAME POOL.
     Do NOT accumulate the tried drivers into the exclude list — with a small
     fleet that excluded everyone after round 1, so an unanswered request was
     never offered to anyone again. Chauffeurs who missed or declined the first
     window deserve the next one too; MAX_RETRY_ROUNDS bounds the process. */
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

    dispatchPrimary(bookingId, pickupLat, pickupLng, userId, excludeDriverIds, retryRound + 1).catch(() => {});
  }, DISPATCH_TIMEOUT_MS);

  return { ok: true };
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

  const drivers = await selectDispatchBatch(
    dropoffLat, dropoffLng, excludeDriverIds, SUPPORT_BATCH_SIZE,
  );

  /* Nobody eligible right now (remember: the PRIMARY driver is excluded) —
     wait a window before retrying so a chauffeur coming online still gets it */
  if (drivers.length === 0) {
    setTimeout(() => {
      dispatchSupport(bookingId, dropoffLat, dropoffLng, userId, excludeDriverIds, retryRound + 1).catch(() => {});
    }, DISPATCH_TIMEOUT_MS);
    return { ok: false, message: "No support driver available this round, retrying" };
  }

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
        body:  `Rendezvous: ${booking.dropoff}${d.distKm > 0 ? ` · ${d.distKm.toFixed(1)} km away` : ""}`,
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

  /* Timeout: cancel any still-PENDING, then re-offer to the SAME pool (see
     dispatchPrimary — accumulating excludes starved small fleets) */
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

    dispatchSupport(bookingId, dropoffLat, dropoffLng, userId, excludeDriverIds, retryRound + 1).catch(() => {});
  }, DISPATCH_TIMEOUT_MS);

  return { ok: true };
}
