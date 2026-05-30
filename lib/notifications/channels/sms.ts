import type { NotificationPayload, ChannelResult } from "../types";

/**
 * SMS Channel Handler
 * Placeholder for future SMS implementation (Twilio, AWS SNS, etc.)
 *
 * TODO: Implement actual SMS sending when ready
 * 1. Add Twilio SDK: npm install twilio
 * 2. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * 3. Implement send logic
 */

const SMS_ENABLED = process.env.SMS_ENABLED === "true";

// Short message templates for SMS
const SMS_TEMPLATES: Record<string, string> = {
  RIDER_DRIVER_ASSIGNED: "Your driver {{driverName}} is on the way! Vehicle: {{vehicle}}. Track: {{url}}",
  RIDER_BOOKING_CONFIRMED: "Your ride is confirmed! Pickup: {{pickup}}. Booking: {{bookingId}}",
  RIDER_RIDE_COMPLETED: "Thanks for riding with us! Your receipt: {{url}}",
  CHAUFFEUR_BOOKING_ASSIGNED: "New booking! Pickup: {{pickup}}. Go online to accept.",
  CHAUFFEUR_PAYOUT_NOTIFICATION: "Payout processed: ${{amount}}. Check your bank account.",
  RIDER_PASSWORD_RESET: "Your verification code is: {{code}}. Valid for 10 minutes.",
  RIDER_EMAIL_VERIFICATION: "Your verification code is: {{code}}. Valid for 10 minutes.",
};

function interpolateTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

export async function sendSMS(payload: NotificationPayload): Promise<ChannelResult> {
  const { eventType, recipient, data = {} } = payload;

  if (!recipient.phone) {
    return { success: false, error: "No phone number provided" };
  }

  // Check if SMS is enabled
  if (!SMS_ENABLED) {
    console.log("[SMS Channel] SMS disabled - would send:", {
      to: recipient.phone,
      eventType,
      data,
    });
    return { success: true, messageId: "mock-sms" };
  }

  // Get template for event type
  const template = SMS_TEMPLATES[eventType];
  if (!template) {
    console.log(`[SMS Channel] No SMS template for ${eventType}`);
    return { success: false, error: `No SMS template for ${eventType}` };
  }

  // Interpolate template with data
  const message = interpolateTemplate(template, data as Record<string, string>);

  try {
    // TODO: Implement actual SMS sending
    // Example with Twilio:
    // const twilio = require('twilio')(accountSid, authToken);
    // await twilio.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: recipient.phone,
    // });

    console.log("[SMS Channel] Would send SMS:", {
      to: recipient.phone,
      message,
    });

    return { success: true, messageId: "pending-implementation" };
  } catch (error) {
    console.error("[SMS Channel] Failed to send SMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS sending failed",
    };
  }
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
