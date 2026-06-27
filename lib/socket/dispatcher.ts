/**
 * Global Socket.IO Event Dispatcher
 *
 * All realtime events go through here. Every API route calls one of these
 * named functions instead of emitting directly. This keeps the event names,
 * payloads, and room targeting in one place.
 *
 * Emissions are fire-and-forget — they never block the API response.
 */

import { getIO } from "./io";
import { SOCKET_EVENTS } from "./events";

function emit(room: string, event: string, data: unknown) {
  try {
    const io = getIO();
    if (!io) {
      console.warn("[socket] emit skipped — io is null");
      return;
    }
    process.nextTick(() => {
      io.to(room).emit(event, data);
      console.log(`[socket] emit → ${room} :: ${event}`);
    });
  } catch (e) {
    console.error("[socket] emit error:", e);
  }
}

function emitMany(rooms: string[], event: string, data: unknown) {
  rooms.forEach((r) => emit(r, event, data));
}

/* ── Booking ──────────────────────────────────────────────────────────────── */

export function dispatchBookingCreated(booking: {
  id: string; pickup: string; dropoff: string; carTier: string;
  carName: string; total: number; status: string; createdAt: string;
}) {
  emit("admin", SOCKET_EVENTS.BOOKING_CREATED, booking);
  /* All drivers in the matching tier room receive new ride alert */
  emit(`tier:${booking.carTier}`, SOCKET_EVENTS.BOOKING_CREATED, booking);
}

export function dispatchBookingAccepted(payload: {
  bookingId: string; driverId: string; userId?: string | null;
  driverName: string; vehicle: string; pickup: string; dropoff: string;
}) {
  emitMany(
    ["admin", `booking:${payload.bookingId}`, ...(payload.userId ? [`user:${payload.userId}`] : [])],
    SOCKET_EVENTS.BOOKING_ACCEPTED,
    payload
  );
}

export function dispatchBookingCancelled(payload: {
  bookingId: string; driverId?: string | null; userId?: string | null;
  cancelledBy: string; refunded: boolean;
}) {
  const rooms = [
    "admin",
    `booking:${payload.bookingId}`,
    ...(payload.userId   ? [`user:${payload.userId}`]     : []),
    ...(payload.driverId ? [`driver:${payload.driverId}`] : []),
  ];
  emitMany(rooms, SOCKET_EVENTS.BOOKING_CANCELLED, payload);
}

export function dispatchBookingCompleted(payload: {
  bookingId: string; driverId?: string | null; userId?: string | null; total: number;
}) {
  const rooms = [
    "admin",
    `booking:${payload.bookingId}`,
    ...(payload.userId   ? [`user:${payload.userId}`]     : []),
    ...(payload.driverId ? [`driver:${payload.driverId}`] : []),
  ];
  emitMany(rooms, SOCKET_EVENTS.BOOKING_COMPLETED, payload);
}

export function dispatchBookingStatus(payload: {
  bookingId: string; status: string; userId?: string | null; driverId?: string | null;
}) {
  const rooms = [
    "admin",
    `booking:${payload.bookingId}`,
    ...(payload.userId   ? [`user:${payload.userId}`]     : []),
    ...(payload.driverId ? [`driver:${payload.driverId}`] : []),
  ];
  emitMany(rooms, SOCKET_EVENTS.BOOKING_STATUS, payload);
}

/* ── Trip ─────────────────────────────────────────────────────────────────── */

export function dispatchTripStarted(payload: {
  bookingId: string; userId?: string | null; driverId?: string | null; startedAt: string;
}) {
  const rooms = [
    "admin",
    `booking:${payload.bookingId}`,
    ...(payload.userId   ? [`user:${payload.userId}`]     : []),
    ...(payload.driverId ? [`driver:${payload.driverId}`] : []),
  ];
  emitMany(rooms, SOCKET_EVENTS.TRIP_STARTED, payload);
}

/* ── Driver location (high-frequency) ────────────────────────────────────── */

export function dispatchDriverLocation(payload: {
  bookingId: string; lat: number; lng: number; heading?: number;
}) {
  emit(`booking:${payload.bookingId}`, SOCKET_EVENTS.DRIVER_LOCATION, payload);
}

/* ── Driver presence ─────────────────────────────────────────────────────── */

export function dispatchDriverOnline(driverId: string, name: string) {
  emit("admin", SOCKET_EVENTS.DRIVER_ONLINE, { driverId, name });
}

export function dispatchDriverOffline(driverId: string, name: string) {
  emit("admin", SOCKET_EVENTS.DRIVER_OFFLINE, { driverId, name });
}

/* ── Messages ────────────────────────────────────────────────────────────── */

export function dispatchMessageNew(payload: {
  bookingId: string; id: string; sender: string; text: string; createdAt: string;
  userId?: string | null; driverId?: string | null;
}) {
  const rooms = [
    `booking:${payload.bookingId}`,
    ...(payload.userId   ? [`user:${payload.userId}`]     : []),
    ...(payload.driverId ? [`driver:${payload.driverId}`] : []),
  ];
  emitMany(rooms, SOCKET_EVENTS.MESSAGE_NEW, payload);
}

/* ── Wallet / Payments ───────────────────────────────────────────────────── */

export function dispatchWalletUpdated(driverId: string, balance: number) {
  emitMany(["admin", `driver:${driverId}`], SOCKET_EVENTS.WALLET_UPDATED, { driverId, balance });
}

/* ── Notifications ───────────────────────────────────────────────────────── */

export function dispatchNotification(payload: {
  targetRoom: string; title: string; body: string; data?: Record<string, string>;
}) {
  emit(payload.targetRoom, SOCKET_EVENTS.NOTIFICATION, payload);
}
