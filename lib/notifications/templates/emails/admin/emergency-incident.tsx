import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminEmergencyIncidentTemplate(
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
    driverName?: string;
    riderName?: string;
    location?: string;
    createdAt: string;
  };

  const preview = `URGENT: Emergency incident reported - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading
        style={{
          color: "#d32f2f",
          fontSize: "28px",
          marginBottom: "16px",
          textTransform: "uppercase",
        }}
      >
        EMERGENCY INCIDENT
      </Heading>

      <Section
        style={{
          backgroundColor: "#ffebee",
          padding: "20px",
          borderRadius: "8px",
          borderLeft: "4px solid #d32f2f",
          marginBottom: "24px",
        }}
      >
        <Text style={{ fontSize: "16px", fontWeight: "600", color: "#d32f2f", marginBottom: "8px" }}>
          IMMEDIATE ATTENTION REQUIRED
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>
          This is a high-priority incident that requires immediate review and action.
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
        }}
      >
        <Text style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
          Incident Details
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Incident ID:</strong> {incident.incidentId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Type:</strong> {incident.type}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Reported By:</strong> {incident.reportedBy} ({incident.reportedByRole})
        </Text>
        {incident.driverName && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Driver:</strong> {incident.driverName}
          </Text>
        )}
        {incident.riderName && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Rider:</strong> {incident.riderName}
          </Text>
        )}
        {incident.location && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Location:</strong> {incident.location}
          </Text>
        )}
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

      <Button
        href={`${settings.baseUrl}/admin/incidents/${incident.incidentId}`}
        style={{
          backgroundColor: "#d32f2f",
          color: "#ffffff",
          padding: "16px 40px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        REVIEW EMERGENCY NOW
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        If this requires immediate emergency services, please contact the appropriate authorities.
      </Text>
    </EmailLayout>
  );

  const text = `
EMERGENCY INCIDENT - IMMEDIATE ATTENTION REQUIRED

This is a high-priority incident that requires immediate review and action.

Incident ID: ${incident.incidentId}
Type: ${incident.type}
Reported By: ${incident.reportedBy} (${incident.reportedByRole})
${incident.driverName ? `Driver: ${incident.driverName}` : ""}
${incident.riderName ? `Rider: ${incident.riderName}` : ""}
${incident.location ? `Location: ${incident.location}` : ""}
${incident.bookingId ? `Booking ID: ${incident.bookingId}` : ""}
Reported: ${incident.createdAt}

Description:
${incident.description}

REVIEW EMERGENCY: ${settings.baseUrl}/admin/incidents/${incident.incidentId}

If this requires immediate emergency services, please contact the appropriate authorities.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `🚨 EMERGENCY: ${incident.type} - IMMEDIATE ACTION REQUIRED`,
    html,
    text,
  };
}
