/**
 * MOVO Notification System
 *
 * Centralized notification service supporting:
 * - Email (Resend)
 * - In-app notifications
 * - Future: SMS, Push notifications
 */

import { prisma } from "@/lib/prisma";
import type {
  NotificationPayload,
  NotificationType,
  NotificationChannel,
  NotificationEventType,
} from "./types";
import { sendEmail } from "./channels/email";
import { sendSMS as sendSMSChannel } from "./channels/sms";
import { createInAppNotification, createAdminBroadcastNotification } from "./channels/in-app";

// Re-export types
export type {
  NotificationPayload,
  NotificationType,
  NotificationChannel,
  NotificationEventType,
  EmailTemplateContext,
  NotificationConfig,
  ChannelResult,
  NotificationRecipient,
} from "./types";

// Default channels for each event type
const DEFAULT_CHANNELS: Record<NotificationEventType, NotificationType[]> = {
  // Rider events: Email + In-app
  RIDER_WELCOME: ["EMAIL", "IN_APP"],
  RIDER_EMAIL_VERIFICATION: ["EMAIL"],
  RIDER_PASSWORD_RESET: ["EMAIL"],
  RIDER_BOOKING_CONFIRMED: ["EMAIL", "IN_APP"],
  RIDER_BOOKING_UPDATED: ["EMAIL", "IN_APP"],
  RIDER_DRIVER_ASSIGNED: ["EMAIL", "IN_APP"],
  RIDER_RIDE_COMPLETED: ["EMAIL", "IN_APP"],
  RIDER_PAYMENT_RECEIPT: ["EMAIL"],
  RIDER_INCIDENT_SUBMITTED: ["EMAIL", "IN_APP"],
  RIDER_INCIDENT_RESOLVED: ["EMAIL", "IN_APP"],
  // Chauffeur events: Email + In-app
  CHAUFFEUR_WELCOME: ["EMAIL", "IN_APP"],
  CHAUFFEUR_ONBOARDING_SUBMITTED: ["EMAIL", "IN_APP"],
  CHAUFFEUR_ONBOARDING_APPROVED: ["EMAIL", "IN_APP"],
  CHAUFFEUR_ONBOARDING_REJECTED: ["EMAIL", "IN_APP"],
  CHAUFFEUR_BOOKING_ASSIGNED: ["EMAIL", "IN_APP"],
  CHAUFFEUR_BOOKING_CANCELLED: ["EMAIL", "IN_APP"],
  CHAUFFEUR_PAYOUT_NOTIFICATION: ["EMAIL", "IN_APP"],
  // Admin events: In-app only (email for emergencies)
  ADMIN_NEW_DRIVER_APPLICATION: ["IN_APP"],
  ADMIN_NEW_INCIDENT_REPORT: ["IN_APP"],
  ADMIN_EMERGENCY_INCIDENT: ["EMAIL", "IN_APP"],
  ADMIN_NEW_FLEET_APPLICATION: ["IN_APP"],
  // Support events: Email + In-app
  SUPPORT_TICKET_CREATED: ["EMAIL", "IN_APP"],
  SUPPORT_TICKET_UPDATED: ["EMAIL", "IN_APP"],
  SUPPORT_TICKET_RESOLVED: ["EMAIL", "IN_APP"],
};

/**
 * Main notification service
 * Handles routing to appropriate channels
 */
export async function sendNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  results: { channel: NotificationType; success: boolean; error?: string }[];
}> {
  const { eventType, channels: overrideChannels } = payload;

  // Determine which channels to use
  const channels = overrideChannels || DEFAULT_CHANNELS[eventType] || ["IN_APP"];

  const results = await Promise.all(
    channels.map(async (channel) => {
      try {
        switch (channel) {
          case "EMAIL":
            const emailResult = await sendEmail(payload);
            return { channel, ...emailResult };

          case "IN_APP":
            const inAppResult = await createInAppNotification(payload);
            return { channel, ...inAppResult };

          case "SMS":
            const smsResult = await sendSMSChannel(payload);
            return { channel, ...smsResult };

          case "PUSH":
            // Future: Implement push via Firebase
            console.log("[Notification] Push channel not yet implemented");
            return { channel, success: false, error: "Push not implemented" };

          default:
            return { channel, success: false, error: `Unknown channel: ${channel}` };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Notification] ${channel} channel failed:`, error);
        return { channel, success: false, error: errorMessage };
      }
    })
  );

  const allSuccessful = results.every((r) => r.success);

  return {
    success: allSuccessful,
    results,
  };
}

/**
 * Send notification to all admins (broadcast)
 */
export async function notifyAdmins(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
  channels: NotificationType[] = ["IN_APP"]
): Promise<{ success: boolean; results: unknown[] }> {
  // Get all admin emails
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, id: true },
  });

  const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];

  if (adminEmails.length === 0) {
    console.warn("[Notification] No admins found to notify");
    return { success: false, results: [] };
  }

  const results = [];

  // Create in-app broadcast
  if (channels.includes("IN_APP")) {
    const inAppResult = await createAdminBroadcastNotification(
      eventType,
      data,
      adminEmails
    );
    results.push({ channel: "IN_APP", ...inAppResult });
  }

  // Send individual emails
  if (channels.includes("EMAIL")) {
    const emailResults = await Promise.all(
      adminEmails.map((email) =>
        sendEmail({
          eventType,
          recipient: {
            type: "admin",
            email,
          },
          data,
        })
      )
    );
    results.push(...emailResults.map((r) => ({ channel: "EMAIL", ...r })));
  }

  return {
    success: results.every((r: { success: boolean }) => r.success),
    results,
  };
}

/**
 * Get unread in-app notifications for a user
 */
export async function getUnreadNotifications(userId: string, role: "user" | "driver") {
  const whereClause =
    role === "user" ? { userId } : { driverId: userId };

  const [notifications, count] = await Promise.all([
    prisma.notification.findMany({
      where: {
        ...whereClause,
        type: "IN_APP",
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: {
        ...whereClause,
        type: "IN_APP",
        readAt: null,
      },
    }),
  ]);

  return { notifications, unreadCount: count };
}

/**
 * Get all notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  role: "user" | "driver",
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) {
  const { page = 1, limit = 20, unreadOnly = false } = options;

  const whereClause =
    role === "user" ? { userId } : { driverId: userId };

  const where = {
    ...whereClause,
    type: "IN_APP",
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { ...whereClause, type: "IN_APP", readAt: null },
    }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    unreadCount,
  };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  role: "user" | "driver"
) {
  const whereClause =
    role === "user"
      ? { id: notificationId, userId }
      : { id: notificationId, driverId: userId };

  return prisma.notification.update({
    where: whereClause,
    data: { readAt: new Date() },
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  userId: string,
  role: "user" | "driver"
) {
  const whereClause =
    role === "user" ? { userId } : { driverId: userId };

  return prisma.notification.updateMany({
    where: {
      ...whereClause,
      type: "IN_APP",
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

/**
 * Convenience methods for common events
 */
export const notificationEvents = {
  // Rider notifications
  riderWelcome: (userId: string, email: string, firstName: string) =>
    sendNotification({
      eventType: "RIDER_WELCOME",
      recipient: { type: "user", id: userId, email, firstName },
    }),

  riderBookingConfirmed: (
    userId: string,
    email: string,
    firstName: string,
    bookingData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_BOOKING_CONFIRMED",
      recipient: { type: "user", id: userId, email, firstName },
      data: bookingData,
    }),

  riderDriverAssigned: (
    userId: string,
    email: string,
    firstName: string,
    bookingData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_DRIVER_ASSIGNED",
      recipient: { type: "user", id: userId, email, firstName },
      data: bookingData,
    }),

  riderRideCompleted: (
    userId: string,
    email: string,
    firstName: string,
    bookingData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_RIDE_COMPLETED",
      recipient: { type: "user", id: userId, email, firstName },
      data: bookingData,
    }),

  riderPaymentReceipt: (
    userId: string,
    email: string,
    firstName: string,
    paymentData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_PAYMENT_RECEIPT",
      recipient: { type: "user", id: userId, email, firstName },
      data: paymentData,
    }),

  riderIncidentSubmitted: (
    userId: string,
    email: string,
    firstName: string,
    incidentData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_INCIDENT_SUBMITTED",
      recipient: { type: "user", id: userId, email, firstName },
      data: incidentData,
    }),

  riderIncidentResolved: (
    userId: string,
    email: string,
    firstName: string,
    incidentData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "RIDER_INCIDENT_RESOLVED",
      recipient: { type: "user", id: userId, email, firstName },
      data: incidentData,
    }),

  // Chauffeur notifications
  chauffeurWelcome: (driverId: string, email: string, firstName: string) =>
    sendNotification({
      eventType: "CHAUFFEUR_WELCOME",
      recipient: { type: "driver", id: driverId, email, firstName },
    }),

  chauffeurBookingAssigned: (
    driverId: string,
    email: string,
    firstName: string,
    bookingData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "CHAUFFEUR_BOOKING_ASSIGNED",
      recipient: { type: "driver", id: driverId, email, firstName },
      data: bookingData,
    }),

  chauffeurOnboardingApproved: (driverId: string, email: string, firstName: string) =>
    sendNotification({
      eventType: "CHAUFFEUR_ONBOARDING_APPROVED",
      recipient: { type: "driver", id: driverId, email, firstName },
    }),

  chauffeurOnboardingRejected: (
    driverId: string,
    email: string,
    firstName: string,
    reason: string
  ) =>
    sendNotification({
      eventType: "CHAUFFEUR_ONBOARDING_REJECTED",
      recipient: { type: "driver", id: driverId, email, firstName },
      data: { reason },
    }),

  chauffeurPayoutNotification: (
    driverId: string,
    email: string,
    firstName: string,
    payoutData: Record<string, unknown>
  ) =>
    sendNotification({
      eventType: "CHAUFFEUR_PAYOUT_NOTIFICATION",
      recipient: { type: "driver", id: driverId, email, firstName },
      data: payoutData,
    }),

  // Admin notifications
  newDriverApplication: (driverData: Record<string, unknown>) =>
    notifyAdmins("ADMIN_NEW_DRIVER_APPLICATION", driverData),

  newIncidentReport: (incidentData: Record<string, unknown>, isEmergency: boolean) =>
    notifyAdmins(
      isEmergency ? "ADMIN_EMERGENCY_INCIDENT" : "ADMIN_NEW_INCIDENT_REPORT",
      incidentData,
      isEmergency ? ["EMAIL", "IN_APP"] : ["IN_APP"]
    ),

  newFleetApplication: (fleetData: Record<string, unknown>) =>
    notifyAdmins("ADMIN_NEW_FLEET_APPLICATION", fleetData),

  supportTicketCreated: (ticketData: Record<string, unknown>) =>
    notifyAdmins("SUPPORT_TICKET_CREATED", ticketData),

  supportTicketResolved: (ticketData: Record<string, unknown>) =>
    notifyAdmins("SUPPORT_TICKET_RESOLVED", ticketData, ["EMAIL", "IN_APP"]),
};
