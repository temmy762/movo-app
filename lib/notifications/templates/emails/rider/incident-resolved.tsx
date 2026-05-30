import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderIncidentResolvedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const incident = data as {
    incidentId: string;
    type: string;
    resolution: string;
    resolvedAt: string;
  };

  const preview = `Your incident report has been resolved - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Incident Report Resolved
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, your incident report has been reviewed and resolved.
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
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Resolved:</strong> {incident.resolvedAt}
        </Text>
      </Section>

      <Text style={{ fontSize: "16px", fontWeight: "600", marginTop: "24px" }}>
        Resolution Summary
      </Text>

      <Text style={{ fontSize: "14px", color: "#333333", lineHeight: "1.6" }}>
        {incident.resolution}
      </Text>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        Thank you for bringing this to our attention. Your feedback helps us maintain a safe and reliable service for everyone.
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
Incident Report Resolved

Hi ${recipient.firstName}, your incident report has been reviewed and resolved.

Report ID: ${incident.incidentId}
Type: ${incident.type}
Resolved: ${incident.resolvedAt}

Resolution Summary:
${incident.resolution}

Thank you for bringing this to our attention. Your feedback helps us maintain a safe and reliable service for everyone.

Contact support: ${settings.baseUrl}/home/support

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Incident report resolved - ${settings.appName}`,
    html,
    text,
  };
}
