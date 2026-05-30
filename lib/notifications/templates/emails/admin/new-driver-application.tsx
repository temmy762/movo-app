import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminNewDriverApplicationTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const driver = data as {
    driverId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city: string;
    vehicleInfo?: string;
    onboardingType: string;
    submittedAt: string;
  };

  const preview = `New driver application requires review - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        New Driver Application
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        A new driver application requires your review.
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
          {driver.firstName} {driver.lastName}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Email:</strong> {driver.email}
        </Text>
        {driver.phone && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Phone:</strong> {driver.phone}
          </Text>
        )}
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>City:</strong> {driver.city}
        </Text>
        {driver.vehicleInfo && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Vehicle:</strong> {driver.vehicleInfo}
          </Text>
        )}
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Type:</strong> {driver.onboardingType}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Submitted:</strong> {driver.submittedAt}
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/admin/drivers/${driver.driverId}`}
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
        Review Application
      </Button>
    </EmailLayout>
  );

  const text = `
New Driver Application

A new driver application requires your review.

Applicant: ${driver.firstName} ${driver.lastName}
Email: ${driver.email}
${driver.phone ? `Phone: ${driver.phone}` : ""}
City: ${driver.city}
${driver.vehicleInfo ? `Vehicle: ${driver.vehicleInfo}` : ""}
Type: ${driver.onboardingType}
Submitted: ${driver.submittedAt}

Review application: ${settings.baseUrl}/admin/drivers/${driver.driverId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `New driver application: ${driver.firstName} ${driver.lastName} - ${settings.appName}`,
    html,
    text,
  };
}
