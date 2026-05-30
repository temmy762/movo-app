import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminNewIncidentTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const incident = data as {
    incidentId: string;
    type: string;
    description: string;
    reportedBy: string;
    reportedByRole: string;
    bookingId?: string;
    createdAt: string;
    aiRiskLevel?: string;
    aiSummary?: string;
  };

  const preview = `New incident report - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        New Incident Report
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        A new incident has been reported and requires review.
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
          <strong>Incident ID:</strong> {incident.incidentId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Type:</strong> {incident.type}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Reported By:</strong> {incident.reportedBy} ({incident.reportedByRole})
        </Text>
        {incident.bookingId && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Booking ID:</strong> {incident.bookingId}
          </Text>
        )}
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Reported:</strong> {incident.createdAt}
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#fff8e1",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
          borderLeft: "4px solid #ffc107",
        }}
      >
        <Text style={{ fontSize: "14px", fontWeight: "600", color: "#333333", marginBottom: "8px" }}>
          Description
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333", lineHeight: "1.5" }}>
          {incident.description}
        </Text>
      </Section>

      {incident.aiSummary && (
        <Section
          style={{
            backgroundColor: "#e3f2fd",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "24px",
          }}
        >
          <Text style={{ fontSize: "14px", fontWeight: "600", color: "#1565c0", marginBottom: "8px" }}>
            AI Summary ({incident.aiRiskLevel || "Unknown Risk"})
          </Text>
          <Text style={{ fontSize: "14px", color: "#333333", lineHeight: "1.5" }}>
            {incident.aiSummary}
          </Text>
        </Section>
      )}

      <Button
        href={`${settings.baseUrl}/admin/incidents/${incident.incidentId}`}
        style={{
          backgroundColor: "#2D0A53",
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
        Review Incident
      </Button>
    </EmailLayout>
  );

  const text = `
New Incident Report

A new incident has been reported and requires review.

Incident ID: ${incident.incidentId}
Type: ${incident.type}
Reported By: ${incident.reportedBy} (${incident.reportedByRole})
${incident.bookingId ? `Booking ID: ${incident.bookingId}` : ""}
Reported: ${incident.createdAt}

Description:
${incident.description}

${incident.aiSummary ? `AI Summary (${incident.aiRiskLevel || "Unknown Risk"}):\n${incident.aiSummary}` : ""}

Review incident: ${settings.baseUrl}/admin/incidents/${incident.incidentId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `New incident report: ${incident.type} - ${settings.appName}`,
    html,
    text,
  };
}
