import type { NotificationEventType, EmailTemplateContext } from "../../types";

// Import rider templates
import { riderWelcomeTemplate } from "./rider/welcome";
import { riderBookingConfirmedTemplate } from "./rider/booking-confirmed";
import { riderDriverAssignedTemplate } from "./rider/driver-assigned";
import { riderRideCompletedTemplate } from "./rider/ride-completed";
import { riderPaymentReceiptTemplate } from "./rider/payment-receipt";
import { riderIncidentSubmittedTemplate } from "./rider/incident-submitted";
import { riderIncidentResolvedTemplate } from "./rider/incident-resolved";
import { riderRideUnavailableRefundedTemplate } from "./rider/ride-unavailable-refunded";

// Import chauffeur templates
import { chauffeurWelcomeTemplate } from "./chauffeur/welcome";
import { chauffeurOnboardingSubmittedTemplate } from "./chauffeur/onboarding-submitted";
import { chauffeurBookingAssignedTemplate } from "./chauffeur/booking-assigned";
import { chauffeurOnboardingApprovedTemplate } from "./chauffeur/onboarding-approved";
import { chauffeurOnboardingRejectedTemplate } from "./chauffeur/onboarding-rejected";
import { chauffeurPayoutTemplate } from "./chauffeur/payout";

// Import admin templates
import { adminNewDriverApplicationTemplate } from "./admin/new-driver-application";
import { adminNewIncidentTemplate } from "./admin/new-incident";
import { adminEmergencyIncidentTemplate } from "./admin/emergency-incident";
import { adminPayoutRequestTemplate } from "./admin/payout-request";
import { adminCareDispatchFailedTemplate } from "./admin/care-dispatch-failed";
import { adminRideDispatchFailedTemplate } from "./admin/ride-dispatch-failed";

// Generic fallback templates
import { passwordResetTemplate } from "./generic/password-reset";
import { emailVerificationTemplate } from "./generic/email-verification";

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

export type EmailTemplate = (
  context: EmailTemplateContext
) => Promise<EmailTemplateResult> | EmailTemplateResult;

// Template registry
const TEMPLATES: Partial<Record<NotificationEventType, EmailTemplate>> = {
  // Rider events
  RIDER_WELCOME: riderWelcomeTemplate,
  RIDER_BOOKING_CONFIRMED: riderBookingConfirmedTemplate,
  RIDER_DRIVER_ASSIGNED: riderDriverAssignedTemplate,
  RIDER_RIDE_COMPLETED: riderRideCompletedTemplate,
  RIDER_PAYMENT_RECEIPT: riderPaymentReceiptTemplate,
  RIDER_INCIDENT_SUBMITTED: riderIncidentSubmittedTemplate,
  RIDER_INCIDENT_RESOLVED: riderIncidentResolvedTemplate,
  RIDER_RIDE_UNAVAILABLE_REFUNDED: riderRideUnavailableRefundedTemplate,

  // Chauffeur events
  CHAUFFEUR_WELCOME: chauffeurWelcomeTemplate,
  CHAUFFEUR_BOOKING_ASSIGNED: chauffeurBookingAssignedTemplate,
  CHAUFFEUR_ONBOARDING_APPROVED: chauffeurOnboardingApprovedTemplate,
  CHAUFFEUR_ONBOARDING_REJECTED: chauffeurOnboardingRejectedTemplate,
  CHAUFFEUR_PAYOUT_NOTIFICATION: chauffeurPayoutTemplate,

  // Admin events
  ADMIN_NEW_DRIVER_APPLICATION: adminNewDriverApplicationTemplate,
  ADMIN_NEW_INCIDENT_REPORT: adminNewIncidentTemplate,
  ADMIN_EMERGENCY_INCIDENT: adminEmergencyIncidentTemplate,
  ADMIN_PAYOUT_REQUEST: adminPayoutRequestTemplate,
  ADMIN_CARE_DISPATCH_FAILED: adminCareDispatchFailedTemplate,
  ADMIN_RIDE_DISPATCH_FAILED: adminRideDispatchFailedTemplate,

  // Generic (used by multiple channels)
  RIDER_EMAIL_VERIFICATION: emailVerificationTemplate,
  RIDER_PASSWORD_RESET: passwordResetTemplate,
  CHAUFFEUR_ONBOARDING_SUBMITTED: chauffeurOnboardingSubmittedTemplate,
  CHAUFFEUR_BOOKING_CANCELLED: chauffeurBookingAssignedTemplate, // Similar structure
};

/**
 * Get email template for event type
 */
export function getEmailTemplate(
  eventType: NotificationEventType
): EmailTemplate | undefined {
  return TEMPLATES[eventType];
}

/**
 * Render email template to HTML/text
 */
export async function renderEmailTemplate(
  eventType: NotificationEventType,
  context: EmailTemplateContext
): Promise<EmailTemplateResult | null> {
  const template = getEmailTemplate(eventType);
  if (!template) return null;

  try {
    return await template(context);
  } catch (error) {
    console.error(`Failed to render template for ${eventType}:`, error);
    return null;
  }
}
