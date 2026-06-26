/* Typed event names — single source of truth for the whole platform */

export const SOCKET_EVENTS = {
  /* ── Booking lifecycle ── */
  BOOKING_CREATED:   "booking.created",
  BOOKING_ACCEPTED:  "booking.accepted",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_COMPLETED: "booking.completed",
  BOOKING_STATUS:    "booking.status",

  /* ── Trip ── */
  TRIP_STARTED: "trip.started",

  /* ── Driver ── */
  DRIVER_ONLINE:    "driver.online",
  DRIVER_OFFLINE:   "driver.offline",
  DRIVER_LOCATION:  "driver.location",
  DRIVER_APPROVED:  "driver.approved",
  DRIVER_SUSPENDED: "driver.suspended",

  /* ── Messaging ── */
  MESSAGE_NEW: "message.new",

  /* ── Payments / Wallet ── */
  PAYMENT_COMPLETED: "payment.completed",
  WALLET_UPDATED:    "wallet.updated",

  /* ── Admin ── */
  ADMIN_STATS_UPDATE: "admin.stats",

  /* ── Notifications ── */
  NOTIFICATION: "notification",

  /* ── Care Ride ── */
  CARE_DRIVER_ASSIGNED: "care.driver_assigned",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
