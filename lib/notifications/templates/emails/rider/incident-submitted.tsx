import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderIncidentSubmittedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const incident = data as {
    incidentId: string;
    type: string;
    bookingId?: string;
    submittedAt: string;
  };

  const preview = `Your incident report has been received - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Incident Report Received
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, we've received your incident report and our team is reviewing it.
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Report ID:</strong> {incident.incidentId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Type:</strong> {incident.type}
        </Text>
        {incident.bookingId && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Related Booking:</strong> {incident.bookingId}
          </Text>
        )}
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Submitted:</strong> {incident.submittedAt}
        </Text>
      </Section>

      <Text style={{ fontSize: "16px", color: "#333333", marginTop: "24px" }}>
        What happens next:
      </Text>

      <ul style={{ fontSize: "16px", color: "#333333", paddingLeft: "20px" }}>
        <li>Our safety team will review your report within 24 hours</li>
        <li>We may contact you for additional information if needed</li>
        <li>You'll receive updates on the status of your report</li>
        <li>Appropriate action will be taken based on our investigation</li>
      </ul>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        Your safety is our top priority. If this is an emergency, please contact local authorities immediately.
      </Text>

      <Button
        href={`${settings.baseUrl}/home/support`}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "16px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Contact Support
      </Button>
    </EmailLayout>
  );

  const text = `
Incident Report Received

Hi ${recipient.firstName}, we've received your incident report and our team is reviewing it.

Report ID: ${incident.incidentId}
Type: ${incident.type}
${incident.bookingId ? `Related Booking: ${incident.bookingId}` : ""}
Submitted: ${incident.submittedAt}

What happens next:
- Our safety team will review your report within 24 hours
- We may contact you for additional information if needed
- You'll receive updates on the status of your report
- Appropriate action will be taken based on our investigation

Your safety is our top priority. If this is an emergency, please contact local authorities immediately.

Contact support: ${settings.baseUrl}/home/support

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Incident report received - ${settings.appName}`,
    html,
    text,
  };
}
