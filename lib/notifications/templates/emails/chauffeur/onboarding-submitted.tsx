import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurOnboardingSubmittedTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, settings } = context;

  const preview = `Application received — we're reviewing your submission, ${recipient.firstName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Application Received!
      </Heading>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Hi {recipient.firstName},
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Thank you for completing your {settings.appName} Chauffeur application. We have received your submission and our team will review it shortly.
      </Text>

      <Section
        style={{
          backgroundColor: "#f5f0ff",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
          borderLeft: "4px solid #2D0A53",
        }}
      >
        <Text style={{ fontSize: "14px", fontWeight: "600", color: "#2D0A53", margin: "0 0 8px 0" }}>
          What happens next?
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333", margin: "0 0 6px 0" }}>
          ✓ Our admin team will verify your documents and information
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333", margin: "0 0 6px 0" }}>
          ✓ Background verification will be initiated
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333", margin: "0 0 6px 0" }}>
          ✓ Review typically takes 1–3 business days
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333", margin: 0 }}>
          ✓ You will be notified by email once a decision is made
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/driver/onboarding/pending`}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "32px",
          marginBottom: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        View Application Status
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666" }}>
        If you have any questions, please contact our support team at{" "}
        <a href={`mailto:${settings.supportEmail}`} style={{ color: "#2D0A53" }}>
          {settings.supportEmail}
        </a>
      </Text>
    </EmailLayout>
  );

  const text = `
Application Received!

Hi ${recipient.firstName},

Thank you for completing your ${settings.appName} Chauffeur application. We have received your submission and our team will review it shortly.

What happens next?
- Our admin team will verify your documents and information
- Background verification will be initiated
- Review typically takes 1-3 business days
- You will be notified by email once a decision is made

View application status: ${settings.baseUrl}/driver/onboarding/pending

If you have any questions, please contact our support team at ${settings.supportEmail}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Application received — we'll be in touch soon`,
    html,
    text,
  };
}
