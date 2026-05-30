import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function emailVerificationTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const verification = data as {
    verificationToken: string;
    verificationUrl: string;
    expiresAt: string;
  };

  const preview = `Verify your email address - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Verify Your Email
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Thanks for signing up! Please verify your email address to complete your registration.
      </Text>

      <Section
        style={{
          backgroundColor: "#fff8e1",
          padding: "16px",
          borderRadius: "8px",
          marginTop: "24px",
          borderLeft: "4px solid #ffc107",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#333333", margin: 0 }}>
          This link expires at: <strong>{verification.expiresAt}</strong>
        </Text>
      </Section>

      <Button
        href={verification.verificationUrl}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "32px",
          marginBottom: "16px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Verify Email Address
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666" }}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={{ fontSize: "12px", color: "#666666", wordBreak: "break-all" }}>
        {verification.verificationUrl}
      </Text>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        If you didn't create an account with us, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );

  const text = `
Verify Your Email

Hi ${recipient.firstName},

Thanks for signing up! Please verify your email address to complete your registration.

Verify Email: ${verification.verificationUrl}

This link expires at: ${verification.expiresAt}

If you didn't create an account with us, you can safely ignore this email.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Please verify your email - ${settings.appName}`,
    html,
    text,
  };
}
