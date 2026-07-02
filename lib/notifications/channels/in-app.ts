import { prisma } from "@/lib/prisma";
import type {
  NotificationPayload,
  ChannelResult,
  NotificationEventType,
} from "../types";

// Human-readable titles for in-app notifications
const EVENT_TITLES: Record<NotificationEventType, string> = {
  // Rider events
  RIDER_WELCOME: "Welcome to MOVO!",
  RIDER_EMAIL_VERIFICATION: "Verify your email",
  RIDER_PASSWORD_RESET: "Password reset requested",
  RIDER_BOOKING_CONFIRMED: "Booking confirmed",
  RIDER_BOOKING_UPDATED: "Booking updated",
  RIDER_DRIVER_ASSIGNED: "Driver assigned",
  RIDER_RIDE_COMPLETED: "Ride completed",
  RIDER_PAYMENT_RECEIPT: "Payment receipt",
  RIDER_INCIDENT_SUBMITTED: "Incident report submitted",
  RIDER_INCIDENT_RESOLVED: "Incident resolved",
  RIDER_RIDE_UNAVAILABLE_REFUNDED: "Ride cancelled — refunded",
  // Chauffeur events
  CHAUFFEUR_WELCOME: "Welcome to MOVO Chauffeur!",
  CHAUFFEUR_ONBOARDING_SUBMITTED: "Application submitted",
  CHAUFFEUR_ONBOARDING_APPROVED: "Application approved!",
  CHAUFFEUR_ONBOARDING_REJECTED: "Application update",
  CHAUFFEUR_BOOKING_ASSIGNED: "New booking assigned",
  CHAUFFEUR_BOOKING_CANCELLED: "Booking cancelled",
  CHAUFFEUR_PAYOUT_NOTIFICATION: "Payout processed",
  CHAUFFEUR_TOPUP_NOTIFICATION: "Wallet top-up update",
  // Admin events
  ADMIN_NEW_DRIVER_APPLICATION: "New driver application",
  ADMIN_NEW_INCIDENT_REPORT: "New incident report",
  ADMIN_EMERGENCY_INCIDENT: "EMERGENCY INCIDENT",
  ADMIN_NEW_FLEET_APPLICATION: "New fleet application",
  ADMIN_PAYOUT_REQUEST: "Driver payout request",
  ADMIN_CARE_DISPATCH_FAILED: "Care Ride dispatch failed",
  ADMIN_RIDE_DISPATCH_FAILED: "Ride dispatch failed",
  // Support events
  SUPPORT_TICKET_CREATED: "Support ticket created",
  SUPPORT_TICKET_UPDATED: "Ticket updated",
  SUPPORT_TICKET_RESOLVED: "Ticket resolved",
};

// Default messages for events
const EVENT_MESSAGES: Record<NotificationEventType, string> = {
  // Rider events
  RIDER_WELCOME: "Welcome aboard! Start booking rides today.",
  RIDER_EMAIL_VERIFICATION: "Please verify your email address to complete registration.",
  RIDER_PASSWORD_RESET: "A password reset was requested for your account.",
  RIDER_BOOKING_CONFIRMED: "Your booking has been confirmed.",
  RIDER_BOOKING_UPDATED: "Your booking details have been updated.",
  RIDER_DRIVER_ASSIGNED: "A driver has been assigned to your ride.",
  RIDER_RIDE_COMPLETED: "Your ride has been completed. Rate your experience!",
  RIDER_PAYMENT_RECEIPT: "Your payment receipt is ready.",
  RIDER_INCIDENT_SUBMITTED: "Your incident report has been submitted.",
  RIDER_INCIDENT_RESOLVED: "Your incident report has been resolved.",
  RIDER_RIDE_UNAVAILABLE_REFUNDED: "We couldn't find a driver for your ride and have issued a full refund.",
  // Chauffeur events
  CHAUFFEUR_WELCOME: "Welcome to the MOVO Chauffeur network!",
  CHAUFFEUR_ONBOARDING_SUBMITTED: "Your application has been submitted for review.",
  CHAUFFEUR_ONBOARDING_APPROVED: "Congratulations! Your application has been approved.",
  CHAUFFEUR_ONBOARDING_REJECTED: "Your application requires additional information.",
  CHAUFFEUR_BOOKING_ASSIGNED: "You have been assigned a new booking.",
  CHAUFFEUR_BOOKING_CANCELLED: "A booking has been cancelled.",
  CHAUFFEUR_PAYOUT_NOTIFICATION: "Your payout has been processed.",
  CHAUFFEUR_TOPUP_NOTIFICATION: "There's an update on your wallet top-up request.",
  // Admin events
  ADMIN_NEW_DRIVER_APPLICATION: "A new driver application requires review.",
  ADMIN_NEW_INCIDENT_REPORT: "A new incident report has been submitted.",
  ADMIN_EMERGENCY_INCIDENT: "URGENT: An emergency incident requires immediate attention.",
  ADMIN_NEW_FLEET_APPLICATION: "A new fleet application has been submitted.",
  ADMIN_PAYOUT_REQUEST: "A driver has requested a payout. Please review and approve.",
  ADMIN_CARE_DISPATCH_FAILED: "No chauffeur could be found for a Care Ride booking. Manual dispatch needed.",
  ADMIN_RIDE_DISPATCH_FAILED: "No driver accepted a ride in time. The rider has been refunded.",
  // Support events
  SUPPORT_TICKET_CREATED: "A new support ticket has been created.",
  SUPPORT_TICKET_UPDATED: "A support ticket has been updated.",
  SUPPORT_TICKET_RESOLVED: "A support ticket has been resolved.",
};

/**
 * In-app notification channel handler
 * Stores notifications in the database for retrieval
 */
export async function createInAppNotification(
  payload: NotificationPayload
): Promise<ChannelResult> {
  const { recipient, eventType, data = {} } = payload;

  // Determine recipient ID and channel
  let userId: string | undefined;
  let driverId: string | undefined;
  let channel: "RIDER" | "CHAUFFEUR" | "ADMIN" | "SYSTEM" = "SYSTEM";

  if (recipient.type === "user" && recipient.id) {
    userId = recipient.id;
    channel = "RIDER";
  } else if (recipient.type === "driver" && recipient.id) {
    driverId = recipient.id;
    channel = "CHAUFFEUR";
  } else if (recipient.type === "admin" || recipient.type === "admin_broadcast") {
    channel = "ADMIN";
  }

  // Extract related entity IDs from data
  const bookingId = data.bookingId as string | undefined;
  const incidentId = data.incidentId as string | undefined;
  const onboardingId = data.onboardingId as string | undefined;
  const ticketId = data.ticketId as string | undefined;

  // Build notification content
  const title = data.title as string || EVENT_TITLES[eventType] || "Notification";
  const message = data.message as string || EVENT_MESSAGES[eventType] || "";

  try {
    const notification = await prisma.notification.create({
      data: {
        type: "IN_APP",
        channel,
        eventType: eventType as never,
        title,
        message,
        data: data as never,
        status: "SENT",
        sentAt: new Date(),
        userId,
        driverId,
        bookingId,
        incidentId,
        onboardingId,
        ticketId,
      },
    });

    return { success: true, messageId: notification.id };
  } catch (error) {
    console.error("[In-App Channel] Failed to create notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create admin broadcast notifications
 * Creates one notification record and links it to all admins
 */
export async function createAdminBroadcastNotification(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
  adminEmails: string[]
): Promise<ChannelResult> {
  const title = data.title as string || EVENT_TITLES[eventType] || "Admin Notification";
  const message = data.message as string || EVENT_MESSAGES[eventType] || "";

  try {
    const notification = await prisma.notification.create({
      data: {
        type: "IN_APP",
        channel: "ADMIN",
        eventType: eventType as never,
        title,
        message,
        data: data as never,
        status: "SENT",
        sentAt: new Date(),
        adminNotifications: {
          create: adminEmails.map((email) => ({
            adminEmail: email,
          })),
        },
      },
    });

    return { success: true, messageId: notification.id };
  } catch (error) {
    console.error("[In-App Channel] Failed to create admin broadcast:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
