import type { NotificationPayload, ChannelResult } from "../types";
import { sendSMS as twilioSend } from "@/lib/sms";

// Short message templates for SMS
const SMS_TEMPLATES: Record<string, string> = {
  RIDER_DRIVER_ASSIGNED: "Your MOVO driver {{driverName}} is on the way! Vehicle: {{vehicle}}.",
  RIDER_BOOKING_CONFIRMED: "Your MOVO ride is confirmed! Pickup: {{pickup}}.",
  RIDER_RIDE_COMPLETED: "Thanks for riding with MOVO! We hope to see you again.",
  CHAUFFEUR_BOOKING_ASSIGNED: "New MOVO booking assigned. Go online to accept.",
  CHAUFFEUR_PAYOUT_NOTIFICATION: "MOVO payout processed: CAD ${{amount}}. Check your account.",
  RIDER_PASSWORD_RESET: "Your MOVO verification code is: {{code}}. Valid for 10 minutes.",
  RIDER_EMAIL_VERIFICATION: "Your MOVO verification code is: {{code}}. Valid for 10 minutes.",
  ADMIN_CARE_DISPATCH_FAILED: "MOVO ALERT: No {{role}} chauffeur found for Care Ride booking {{bookingId}}. Manual dispatch needed.",
  ADMIN_CARE_SUPPORT_STRANDED: "MOVO ALERT: Safe Ride {{bookingId}} — chauffeur delivered the customer but has no support chauffeur to return them. Auto-search running; dispatch manually if it doesn't fill.",
  ADMIN_SAFE_RIDE_BOOK_UBER: "MOVO DISPATCH: Safe Ride {{bookingId}} delivered. Book an Uber for {{driverName}} from {{from}} to {{to}}, then record it in the admin Safe Ride panel.",
  CHAUFFEUR_UBER_RETURN_BOOKED: "MOVO: Your Uber back to your vehicle is booked{{refText}}. Pickup at {{from}}.",
  ADMIN_RESERVATION_NO_SHOW: "MOVO ALERT: Reserved ride {{bookingRef}} — pickup was {{pickupTime}} and chauffeur {{driverName}} ({{driverPhone}}) hasn't set off. Rider: {{riderPhone}}.",
  ADMIN_RIDE_DISPATCH_FAILED: "MOVO ALERT: No driver accepted booking {{bookingId}} in time. Rider has been refunded.",
  RIDER_RIDE_UNAVAILABLE_REFUNDED: "MOVO: We couldn't find a driver for your ride. You've been fully refunded — sorry for the inconvenience.",
  RIDER_BOOKING_CANCELLED: "MOVO: Your ride has been cancelled. {{refundMsg}}",
  CHAUFFEUR_BOOKING_CANCELLED: "MOVO: The ride from {{pickup}} was cancelled by the rider. You're back in the queue for new requests.",
};

function interpolateTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => data[key] || "");
}

export async function sendSMS(payload: NotificationPayload): Promise<ChannelResult> {
  const { eventType, recipient, data = {} } = payload;

  if (!recipient.phone) {
    return { success: false, error: "No phone number provided" };
  }

  const template = SMS_TEMPLATES[eventType];
  if (!template) {
    return { success: false, error: `No SMS template for ${eventType}` };
  }

  const message = interpolateTemplate(template, data as Record<string, string>);
  const sent = await twilioSend(recipient.phone, message);

  if (!sent) {
    return { success: false, error: "Twilio send failed — check credentials" };
  }
  return { success: true };
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic international phone validation
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Format phone number for international sending
 */
export function formatPhoneNumber(phone: string, countryCode = "1"): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith(countryCode)) {
    return `+${cleaned}`;
  }
  return `+${countryCode}${cleaned}`;
}
