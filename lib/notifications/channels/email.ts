import { Resend } from "resend";
import type { NotificationPayload, ChannelResult, EmailTemplateContext } from "../types";
import { getEmailTemplate } from "../templates/emails";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@movoprive.com";
const FROM_NAME = process.env.FROM_NAME || "MOVO";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "MOVO";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@movoprive.com";
const LOGO_URL = process.env.LOGO_URL || "https://movoprive.com/images/logo/logo-icon-navy.png";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://movoprive.com";

/**
 * Email channel handler using Resend
 */
export async function sendEmail(
  payload: NotificationPayload
): Promise<ChannelResult> {
  if (!resend) {
    console.warn("[Email Channel] Resend not configured - email would be sent:", {
      to: payload.recipient.email,
      eventType: payload.eventType,
    });
    return { success: true, messageId: "mock" }; // Return success in dev mode
  }

  const { recipient, eventType, data = {} } = payload;

  if (!recipient.email) {
    return { success: false, error: "No email address provided" };
  }

  try {
    // Build template context
    const templateContext: EmailTemplateContext = {
      recipient: {
        firstName: recipient.firstName || "Valued Customer",
        lastName: recipient.lastName,
        email: recipient.email,
      },
      data,
      settings: {
        appName: APP_NAME,
        supportEmail: SUPPORT_EMAIL,
        logoUrl: LOGO_URL,
        baseUrl: BASE_URL,
      },
    };

    // Get email template for this event type
    const template = getEmailTemplate(eventType);
    if (!template) {
      return { success: false, error: `No email template found for ${eventType}` };
    }

    // Generate email content
    // NOTE: @react-email/render v1.x returns Promise<string> — resolve safely
    const rawResult = await template(templateContext);
    const html = await Promise.resolve(rawResult.html as string | Promise<string>);
    const { subject, text } = rawResult;

    // Send email via Resend
    const { data: result, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipient.email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email Channel] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error("[Email Channel] Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch send emails (useful for admin broadcasts)
 */
export async function sendBatchEmails(
  payloads: NotificationPayload[]
): Promise<ChannelResult[]> {
  return Promise.all(payloads.map(sendEmail));
}
