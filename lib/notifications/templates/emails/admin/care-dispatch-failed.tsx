import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminCareDispatchFailedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { data, settings } = context;
  const info = data as {
    bookingId: string;
    role: "PRIMARY" | "SUPPORT";
    pickup?: string;
    dropoff?: string;
    clientName?: string;
  };

  const roleLabel = info.role === "PRIMARY" ? "Primary" : "Support";
  const preview = `Movo Care Ride — no ${roleLabel} chauffeur found - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#b91c1c", fontSize: "24px", marginBottom: "16px" }}>
        Care Ride Dispatch Failed
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        No available <strong>{roleLabel}</strong> chauffeur could be found for a Movo Care Ride
        after exhausting all retry rounds. Manual intervention is required.
      </Text>

      <Section
        style={{
          backgroundColor: "#fff1f2",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
          borderLeft: "4px solid #ef4444",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Booking ID:</strong> {info.bookingId}
        </Text>
        {info.clientName && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Client:</strong> {info.clientName}
          </Text>
        )}
        {info.pickup && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Pickup:</strong> {info.pickup}
          </Text>
        )}
        {info.dropoff && (
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Dropoff:</strong> {info.dropoff}
          </Text>
        )}
      </Section>

      <Button
        href={`${settings.baseUrl}/admin/bookings`}
        style={{
          backgroundColor: "#131936",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Review Booking
      </Button>
    </EmailLayout>
  );

  const text = `
Care Ride Dispatch Failed

No available ${roleLabel} chauffeur could be found for a Movo Care Ride after exhausting all retry rounds. Manual intervention is required.

Booking ID: ${info.bookingId}
${info.clientName ? `Client: ${info.clientName}` : ""}
${info.pickup ? `Pickup: ${info.pickup}` : ""}
${info.dropoff ? `Dropoff: ${info.dropoff}` : ""}

Review booking: ${settings.baseUrl}/admin/bookings

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `⚠️ Care Ride: no ${roleLabel} chauffeur found - ${settings.appName}`,
    html,
    text,
  };
}
