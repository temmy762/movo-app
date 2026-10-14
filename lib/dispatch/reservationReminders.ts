/**
 * Reserved In-City rides: once a chauffeur accepts a ride booked for later,
 * nothing used to remind them — a forgotten reservation left the rider waiting
 * with no alert to anyone. Timers (re-armed at startup by recoverTimers):
 *   pickup − 60 min  → push the chauffeur a reminder
 *   pickup − 15 min  → if they haven't set off, push "time to head to pickup"
 *   pickup + 10 min  → if they still haven't set off, alert Movo admins
 */
import { prisma } from "@/lib/prisma";
import { setLongTimeout } from "@/lib/longTimeout";
import { pushToDriver } from "@/lib/webpush";
import { notifyAdmins } from "@/lib/notifications";

const MIN = 60 * 1000;
const STEPS = [
  { at: -60 * MIN, kind: "reminder" },
  { at: -15 * MIN, kind: "set_off" },
  { at: 10 * MIN,  kind: "no_show" },
] as const;

const winnipegTime = (d: Date) =>
  d.toLocaleString("en-CA", { timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** driverId: the chauffeur who accepted — if the ride is handed to someone
    else, their own accept schedules new reminders and these stand down */
export function scheduleReservationReminders(bookingId: string, scheduledAt: Date, driverId: string): void {
  for (const step of STEPS) {
    const delay = scheduledAt.getTime() + step.at - Date.now();
    /* Don't fire reminders that are already in the past (e.g. accepted late);
       the no-show check still runs if its moment has passed */
    if (delay < 0 && step.kind !== "no_show") continue;
    setLongTimeout(() => {
      fireStep(bookingId, step.kind, driverId).catch((e) => console.error("[reservation reminder]", e));
    }, delay);
  }
}

async function fireStep(bookingId: string, kind: (typeof STEPS)[number]["kind"], driverId: string): Promise<void> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      status: true, driverId: true, scheduledAt: true, enRouteAt: true, arrivedAt: true, startedAt: true,
      pickup: true, clientName: true, riderPhone: true, bookingNumber: true,
      user: { select: { phone: true } },
      driver: { select: { firstName: true, lastName: true, phone: true } },
    },
  });
  /* Still this chauffeur's confirmed reservation, and they haven't set off */
  if (!b || b.status !== "CONFIRMED" || b.driverId !== driverId || !b.scheduledAt) return;
  if (b.enRouteAt || b.arrivedAt || b.startedAt) return;
  const when = winnipegTime(b.scheduledAt);

  if (kind === "reminder") {
    await pushToDriver(driverId, {
      title: "Reserved ride in 1 hour",
      body:  `Pickup at ${when} — ${b.pickup}. Tap "Heading to pickup" in Reserved Rides when you set off.`,
      tag:   `reservation-reminder-${bookingId}`,
      data:  { type: "reservation_reminder", bookingId },
    }).catch(() => {});
    return;
  }

  if (kind === "set_off") {
    await pushToDriver(driverId, {
      title: "Time to head to your pickup",
      body:  `Your reserved ride is at ${when} — ${b.pickup}. Open Reserved Rides and tap "Heading to pickup".`,
      tag:   `reservation-reminder-${bookingId}`,
      data:  { type: "reservation_reminder", bookingId, requireInteraction: "true" },
    }).catch(() => {});
    return;
  }

  /* no_show: pickup time has passed and the chauffeur never set off */
  await notifyAdmins(
    "ADMIN_RESERVATION_NO_SHOW",
    {
      bookingId,
      bookingRef:  b.bookingNumber ?? bookingId,
      pickupTime:  when,
      pickup:      b.pickup,
      clientName:  b.clientName,
      riderPhone:  b.riderPhone ?? b.user?.phone ?? "n/a",
      driverName:  b.driver ? `${b.driver.firstName} ${b.driver.lastName}` : "the chauffeur",
      driverPhone: b.driver?.phone ?? "n/a",
    },
    ["EMAIL", "IN_APP", "SMS"],
  ).catch((e) => console.error("[reservation no-show alert]", e));
}
