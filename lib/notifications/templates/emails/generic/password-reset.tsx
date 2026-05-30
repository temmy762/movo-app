import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function passwordResetTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const reset = data as {
    resetToken: string;
    resetUrl: string;
    expiresAt: string;
  };

  const preview = `Password reset request - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Password Reset Request
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        We received a request to reset your password. Click the button below to set a new password.
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
          This link expires at: <strong>{reset.expiresAt}</strong>
        </Text>
      </Section>

      <Button
        href={reset.resetUrl}
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
        Reset Password
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666" }}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={{ fontSize: "12px", color: "#666666", wordBreak: "break-all" }}>
        {reset.resetUrl}
      </Text>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
      </Text>
    </EmailLayout>
  );

  const text = `
Password Reset Request

Hi ${recipient.firstName},

We received a request to reset your password. Click the link below to set a new password.

Reset Password: ${reset.resetUrl}

This link expires at: ${reset.expiresAt}

If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Password reset request - ${settings.appName}`,
    html,
    text,
  };
}
