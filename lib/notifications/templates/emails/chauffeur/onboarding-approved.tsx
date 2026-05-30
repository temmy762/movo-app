import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurOnboardingApprovedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, settings } = context;

  const preview = `Congratulations! Your application has been approved - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        You're Approved!
      </Heading>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Congratulations, {recipient.firstName}!
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        We're excited to inform you that your application to join the {settings.appName} Chauffeur network has been approved!
      </Text>

      <Section
        style={{
          backgroundColor: "#2D0A53",
          padding: "24px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "8px" }}>
          What's Next?
        </Text>
        <ul style={{ fontSize: "14px", color: "#ffffff", paddingLeft: "20px", margin: 0 }}>
          <li style={{ marginBottom: "8px" }}>Log into the driver app</li>
          <li style={{ marginBottom: "8px" }}>Set your availability</li>
          <li style={{ marginBottom: "8px" }}>Start accepting ride requests</li>
          <li>Track your earnings in real-time</li>
        </ul>
      </Section>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", marginTop: "24px" }}>
        As a {settings.appName} chauffeur, you'll enjoy:
      </Text>

      <ul style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", paddingLeft: "20px" }}>
        <li>Competitive earnings with transparent pricing</li>
        <li>Flexible scheduling - drive when you want</li>
        <li>In-app navigation and ride management</li>
        <li>Weekly payouts directly to your bank account</li>
        <li>24/7 driver support</li>
      </ul>

      <Button
        href={`${settings.baseUrl}/driver/home`}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          marginBottom: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Go to Driver Dashboard
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666" }}>
        Welcome to the team! We look forward to a successful partnership.
      </Text>
    </EmailLayout>
  );

  const text = `
You're Approved!

Congratulations, ${recipient.firstName}!

We're excited to inform you that your application to join the ${settings.appName} Chauffeur network has been approved!

What's Next?
- Log into the driver app
- Set your availability
- Start accepting ride requests
- Track your earnings in real-time

As a ${settings.appName} chauffeur, you'll enjoy:
- Competitive earnings with transparent pricing
- Flexible scheduling - drive when you want
- In-app navigation and ride management
- Weekly payouts directly to your bank account
- 24/7 driver support

Go to driver dashboard: ${settings.baseUrl}/driver/home

Welcome to the team! We look forward to a successful partnership.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `You're approved! Welcome to ${settings.appName} Chauffeur`,
    html,
    text,
  };
}
