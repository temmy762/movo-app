import type { NotificationPayload, ChannelResult } from "../types";

/**
 * Push Notification Channel Handler
 * Placeholder for future push notification implementation (Firebase, OneSignal, etc.)
 *
 * TODO: Implement actual push notifications when ready
 * 1. Add Firebase Admin SDK: npm install firebase-admin
 * 2. Configure FCM credentials
 * 3. Store device tokens in User/Driver model
 * 4. Implement send logic
 */

const PUSH_ENABLED = process.env.PUSH_ENABLED === "true";

// Push notification payloads
const PUSH_TEMPLATES: Record<string, { title: string; body: string; data?: Record<string, string> }> = {
  RIDER_DRIVER_ASSIGNED: {
    title: "Driver on the way!",
    body: "{{driverName}} is arriving in {{eta}} minutes",
    data: { type: "driver_assigned", bookingId: "{{bookingId}}" },
  },
  RIDER_BOOKING_CONFIRMED: {
    title: "Booking confirmed",
    body: "Your ride is confirmed for {{scheduledTime}}",
    data: { type: "booking_confirmed", bookingId: "{{bookingId}}" },
  },
  RIDER_RIDE_COMPLETED: {
    title: "Ride completed",
    body: "Thanks for riding with us!",
    data: { type: "ride_completed", bookingId: "{{bookingId}}" },
  },
  CHAUFFEUR_BOOKING_ASSIGNED: {
    title: "New booking",
    body: "Pickup: {{pickup}} - {{distance}} away",
    data: { type: "new_booking", bookingId: "{{bookingId}}" },
  },
  CHAUFFEUR_BOOKING_CANCELLED: {
    title: "Booking cancelled",
    body: "A booking has been cancelled",
    data: { type: "booking_cancelled", bookingId: "{{bookingId}}" },
  },
};

function interpolateTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

function interpolateObject(
  obj: Record<string, string> | undefined,
  data: Record<string, string>
): Record<string, string> | undefined {
  if (!obj) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = interpolateTemplate(value, data);
  }
  return result;
}

export async function sendPushNotification(
  payload: NotificationPayload
): Promise<ChannelResult> {
  const { eventType, recipient, data = {} } = payload;

  // Check if push is enabled
  if (!PUSH_ENABLED) {
    console.log("[Push Channel] Push disabled - would send:", {
      to: recipient.id,
      eventType,
      data,
    });
    return { success: true, messageId: "mock-push" };
  }

  // Get template for event type
  const template = PUSH_TEMPLATES[eventType];
  if (!template) {
    console.log(`[Push Channel] No push template for ${eventType}`);
    return { success: false, error: `No push template for ${eventType}` };
  }

  // Interpolate template with data
  const title = interpolateTemplate(template.title, data as Record<string, string>);
  const body = interpolateTemplate(template.body, data as Record<string, string>);
  const pushData = interpolateObject(template.data, data as Record<string, string>);

  try {
    // TODO: Implement actual push notification sending
    // Example with Firebase:
    // const admin = require('firebase-admin');
    // await admin.messaging().send({
    //   token: recipient.pushToken,
    //   notification: { title, body },
    //   data: pushData,
    // });

    console.log("[Push Channel] Would send push notification:", {
      to: recipient.id,
      title,
      body,
      data: pushData,
    });

    return { success: true, messageId: "pending-implementation" };
  } catch (error) {
    console.error("[Push Channel] Failed to send push:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Push sending failed",
    };
  }
}

/**
 * Subscribe device to topics (for broadcast notifications)
 */
export async function subscribeToTopic(token: string, topic: string): Promise<boolean> {
  // TODO: Implement with Firebase
  console.log(`[Push Channel] Would subscribe ${token} to topic ${topic}`);
  return true;
}

/**
 * Unsubscribe device from topics
 */
export async function unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
  // TODO: Implement with Firebase
  console.log(`[Push Channel] Would unsubscribe ${token} from topic ${topic}`);
  return true;
}

/**
 * Send broadcast push notification to topic
 */
export async function sendBroadcastPush(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<ChannelResult> {
  // TODO: Implement with Firebase
  console.log(`[Push Channel] Would broadcast to ${topic}:`, { title, body, data });
  return { success: true, messageId: "pending-implementation" };
}
