// Notification System Types

export type NotificationType = "EMAIL" | "IN_APP" | "SMS" | "PUSH";

export type NotificationChannel = "RIDER" | "CHAUFFEUR" | "ADMIN" | "SYSTEM";

export type NotificationEventType =
  // Rider events
  | "RIDER_WELCOME"
  | "RIDER_EMAIL_VERIFICATION"
  | "RIDER_PASSWORD_RESET"
  | "RIDER_BOOKING_CONFIRMED"
  | "RIDER_BOOKING_UPDATED"
  | "RIDER_DRIVER_ASSIGNED"
  | "RIDER_RIDE_COMPLETED"
  | "RIDER_PAYMENT_RECEIPT"
  | "RIDER_INCIDENT_SUBMITTED"
  | "RIDER_INCIDENT_RESOLVED"
  // Chauffeur events
  | "CHAUFFEUR_WELCOME"
  | "CHAUFFEUR_ONBOARDING_SUBMITTED"
  | "CHAUFFEUR_ONBOARDING_APPROVED"
  | "CHAUFFEUR_ONBOARDING_REJECTED"
  | "CHAUFFEUR_BOOKING_ASSIGNED"
  | "CHAUFFEUR_BOOKING_CANCELLED"
  | "CHAUFFEUR_PAYOUT_NOTIFICATION"
  // Admin events
  | "ADMIN_NEW_DRIVER_APPLICATION"
  | "ADMIN_NEW_INCIDENT_REPORT"
  | "ADMIN_EMERGENCY_INCIDENT"
  | "ADMIN_NEW_FLEET_APPLICATION"
  | "ADMIN_PAYOUT_REQUEST"
  // Support events
  | "SUPPORT_TICKET_CREATED"
  | "SUPPORT_TICKET_UPDATED"
  | "SUPPORT_TICKET_RESOLVED";

export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED";

// Recipient types
export interface NotificationRecipient {
  type: "user" | "driver" | "admin" | "admin_broadcast";
  id?: string; // For user/driver
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

// Event payload with context
export interface NotificationPayload {
  eventType: NotificationEventType;
  recipient: NotificationRecipient;
  data?: Record<string, unknown>; // Booking data, incident data, etc.
  channels?: NotificationType[]; // Override default channels
}

// Template context passed to email templates
export interface EmailTemplateContext {
  recipient: {
    firstName: string;
    lastName?: string;
    email: string;
  };
  data: Record<string, unknown>;
  settings: {
    appName: string;
    supportEmail: string;
    logoUrl: string;
    baseUrl: string;
  };
}

// Configuration for notification service
export interface NotificationConfig {
  resendApiKey: string;
  fromEmail: string;
  fromName: string;
  appName: string;
  supportEmail: string;
  logoUrl: string;
  baseUrl: string;
}

// Channel handlers return type
export interface ChannelResult {
  success: boolean;
  error?: string;
  messageId?: string;
}
